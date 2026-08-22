import { getSql } from "@/lib/db";
import { DEMO, newId } from "@/lib/trust/ids";
import { audit } from "@/lib/trust/runtime";
import { CONFIG_ID } from "./constants";
import { credentialResponse, parseCredentialRequest, parseTokenRequest } from "./protocol";
import { generateAccessToken, hashVciToken, hashesMatch, parseVciBearer } from "./tokens";

type DeliveryRow = {
  id: string;
  credential_id: string;
  tenant_id: string;
  status: string;
  holder_id: string | null;
  credential_json: string;
  holder_name: string;
  degree_name: string;
  opaque_ref: string;
};

async function deliveryForCode(code: string): Promise<DeliveryRow | null> {
  const sql = await getSql();
  const rows = await sql<DeliveryRow>`
    select d.id, d.credential_id, d.tenant_id, d.status, d.holder_id,
           c.credential_json, c.holder_name, c.degree_name, c.opaque_ref
    from credential_deliveries d
    join credentials c on c.id = d.credential_id
    where d.claim_token = ${code}`;
  return rows[0] ?? null;
}

/** Demo playground only. Production codes stay single-use. */
export async function resetDemoPreAuthorizedCode(code: string): Promise<void> {
  if (code !== DEMO.claimToken) return;
  const delivery = await deliveryForCode(code);
  if (!delivery || delivery.status === "CLAIMED") return;
  const sql = await getSql();
  await sql`update oid4vci_access_tokens set status = ${"EXPIRED"} where delivery_id = ${delivery.id}`;
  if (delivery.status === "DELIVERED") {
    await sql`update credential_deliveries set status = ${"PENDING"} where id = ${delivery.id} and status = ${"DELIVERED"}`;
  }
}

export async function exchangePreAuthorizedCode(form: Record<string, string>): Promise<
  | { ok: true; access_token: string; token_type: "Bearer"; expires_in: number; c_nonce?: undefined }
  | { ok: false; status: number; error: string; error_description: string }
> {
  const parsed = parseTokenRequest(form);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error, error_description: parsed.error_description };
  const delivery = await deliveryForCode(parsed.request.preAuthorizedCode!);
  if (!delivery) {
    return { ok: false, status: 400, error: "invalid_grant", error_description: "pre-authorized_code is not valid" };
  }
  if (delivery.status === "CLAIMED" || delivery.status === "DELIVERED") {
    return { ok: false, status: 400, error: "invalid_grant", error_description: "pre-authorized_code has already been used" };
  }
  const sql = await getSql();
  const existing = await sql<{ id: string }>`
    select id from oid4vci_access_tokens
    where delivery_id = ${delivery.id} and status = ${"ACTIVE"}
      and expires_at > ${new Date().toISOString()}`;
  if (existing[0]) {
    return { ok: false, status: 400, error: "invalid_grant", error_description: "pre-authorized_code has already been exchanged" };
  }
  const token = generateAccessToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await sql`
    insert into oid4vci_access_tokens (id, delivery_id, tenant_id, token_hash, prefix, status, expires_at)
    values (
      ${newId("vci")}, ${delivery.id}, ${delivery.tenant_id}, ${token.hash}, ${token.prefix},
      ${"ACTIVE"}, ${expiresAt.toISOString()}
    )`;
  await audit({
    tenantId: delivery.tenant_id,
    action: "oid4vci.token.issued",
    resourceType: "credential",
    resourceId: delivery.credential_id,
    metadata: { prefix: token.prefix },
  });
  return { ok: true, access_token: token.secret, token_type: "Bearer", expires_in: 600 };
}

export async function issueCredentialFromToken(input: {
  authorization: string | null;
  body: Record<string, unknown>;
}): Promise<
  | { ok: true; body: ReturnType<typeof credentialResponse> }
  | { ok: false; status: number; error: string; error_description: string }
> {
  const parsed = parseCredentialRequest(input.body);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error, error_description: parsed.error_description };
  const secret = parseVciBearer(input.authorization);
  if (!secret) {
    return { ok: false, status: 401, error: "invalid_token", error_description: "Bearer mtx_vci_ access token required" };
  }
  const digest = hashVciToken(secret);
  const sql = await getSql();
  const tokens = await sql<{
    id: string;
    delivery_id: string;
    token_hash: string;
    status: string;
    expires_at: string;
  }>`
    select id, delivery_id, token_hash, status, expires_at::text as expires_at
    from oid4vci_access_tokens where token_hash = ${digest} limit 1`;
  const row = tokens[0];
  if (!row || !hashesMatch(row.token_hash, digest)) {
    return { ok: false, status: 401, error: "invalid_token", error_description: "Access token is not valid" };
  }
  if (row.status !== "ACTIVE") {
    return { ok: false, status: 400, error: "invalid_token", error_description: "Access token has already been used" };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await sql`update oid4vci_access_tokens set status = ${"EXPIRED"} where id = ${row.id}`;
    return { ok: false, status: 400, error: "invalid_token", error_description: "Access token expired" };
  }
  const deliveries = await sql<{
    id: string;
    credential_id: string;
    tenant_id: string;
    status: string;
    credential_json: string;
  }>`
    select d.id, d.credential_id, d.tenant_id, d.status, c.credential_json
    from credential_deliveries d
    join credentials c on c.id = d.credential_id
    where d.id = ${row.delivery_id}`;
  const delivery = deliveries[0];
  if (!delivery) return { ok: false, status: 400, error: "invalid_grant", error_description: "Delivery missing" };
  const credential = JSON.parse(delivery.credential_json) as Record<string, unknown>;
  await sql`
    update oid4vci_access_tokens
    set status = ${"USED"}, used_at = ${new Date().toISOString()}
    where id = ${row.id} and status = ${"ACTIVE"}`;
  if (delivery.status === "PENDING") {
    await sql`update credential_deliveries set status = ${"DELIVERED"} where id = ${delivery.id} and status = ${"PENDING"}`;
  }
  await audit({
    tenantId: delivery.tenant_id,
    action: "oid4vci.credential.issued",
    resourceType: "credential",
    resourceId: delivery.credential_id,
    metadata: { configurationId: CONFIG_ID },
  });
  return { ok: true, body: credentialResponse(credential) };
}
