import { getSql } from "@/lib/db";
import { openSecret } from "@/lib/trust/seal";
import { newId } from "@/lib/trust/ids";
import { audit } from "@/lib/trust/runtime";
import { signWebhookPayload } from "./hmac";
import { verificationEventPayload } from "./payload";
import type { MachineVerification } from "@/lib/api/machine";

export type WebhookTransport = (input: {
  url: string;
  headers: Record<string, string>;
  body: string;
}) => Promise<{ ok: boolean; status: number; error?: string }>;

const defaultTransport: WebhookTransport = async ({ url, headers, body }) => {
  try {
    const res = await fetch(url, { method: "POST", headers, body });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: (err as Error).message };
  }
};

export async function dispatchVerificationWebhooks(input: {
  tenantId: string;
  result: MachineVerification;
  source: "ui" | "api";
  transport?: WebhookTransport;
}): Promise<number> {
  const sql = await getSql();
  const endpoints = await sql<{ id: string; url: string; secret_sealed: string }>`
    select id, url, secret_sealed from webhook_endpoints
    where tenant_id = ${input.tenantId} and status = ${"ACTIVE"}`;
  if (!endpoints.length) return 0;
  const transport = input.transport ?? defaultTransport;
  let sent = 0;
  for (const endpoint of endpoints) {
    const eventId = newId("wh");
    const payload = JSON.stringify(verificationEventPayload({ eventId, result: input.result, source: input.source }));
    let secret: string;
    try {
      secret = openSecret(endpoint.secret_sealed);
    } catch {
      await sql`
        insert into webhook_deliveries (
          id, endpoint_id, tenant_id, event_type, payload_json, payload_hash, signature, status, error_text
        ) values (
          ${eventId}, ${endpoint.id}, ${input.tenantId}, ${"verification.completed"},
          ${payload}, ${"sha256:unsealed"}, ${"unsigned"}, ${"FAILED"},
          ${"Signing secret could not be unsealed. Unsigned delivery refused."}
        )`;
      continue;
    }
    let signed;
    try {
      signed = signWebhookPayload(secret, payload);
    } catch (err) {
      await sql`
        insert into webhook_deliveries (
          id, endpoint_id, tenant_id, event_type, payload_json, payload_hash, signature, status, error_text
        ) values (
          ${eventId}, ${endpoint.id}, ${input.tenantId}, ${"verification.completed"},
          ${payload}, ${"sha256:unsigned"}, ${"unsigned"}, ${"FAILED"},
          ${(err as Error).message}
        )`;
      continue;
    }
    const posted = await transport({
      url: endpoint.url,
      headers: {
        "content-type": "application/json",
        "matrixly-signature": signed.header,
        "matrixly-event-id": eventId,
      },
      body: payload,
    });
    await sql`
      insert into webhook_deliveries (
        id, endpoint_id, tenant_id, event_type, payload_json, payload_hash, signature, status, http_status, error_text
      ) values (
        ${eventId}, ${endpoint.id}, ${input.tenantId}, ${"verification.completed"},
        ${payload}, ${signed.payloadHash}, ${signed.signature},
        ${posted.ok ? "DELIVERED" : "FAILED"},
        ${posted.status}, ${posted.error ?? null}
      )`;
    await audit({
      tenantId: input.tenantId,
      action: posted.ok ? "webhook.delivered" : "webhook.failed",
      resourceType: "webhook",
      resourceId: endpoint.id,
      metadata: { eventId, httpStatus: posted.status, status: input.result.status },
    });
    if (posted.ok) sent += 1;
  }
  return sent;
}
