import { getSql } from "@/lib/db";
import { AUDIT_GENESIS, auditEventHash } from "@/lib/audit/chain";
import { createDidKeyIdentity } from "@/lib/identity/keys";
import { createLedger, type RuntimeLedger } from "@/lib/ledger/factory";
import { getStorage } from "@/lib/storage/factory";
import { getKms } from "@/lib/crypto/kms";
import { sealSecret } from "./seal";

export async function getLedger(): Promise<RuntimeLedger> {
  return createLedger();
}

export { getStorage } from "@/lib/storage/factory";
export { publishedStatusResolve } from "@/lib/status/local";

export async function readDocumentBytes(
  objectName: string,
  fallbackB64?: string | null,
): Promise<Uint8Array> {
  const storage = await getStorage();
  try {
    return await storage.get(objectName);
  } catch {
    if (fallbackB64) return Uint8Array.from(Buffer.from(fallbackB64, "base64"));
    throw new Error(`Document object ${objectName} was not found in storage`);
  }
}

export function runtimeAdapterStatus() {
  const ledger =
    (typeof process !== "undefined" ? process.env.LEDGER_ADAPTER : undefined)?.trim().toLowerCase() === "fabric"
      ? "fabric"
      : "hashchain";
  const storage = (typeof process !== "undefined" ? process.env.STORAGE_BACKEND : undefined)?.trim().toLowerCase() || "db";
  const kms = (typeof process !== "undefined" ? process.env.KMS_BACKEND : undefined)?.trim().toLowerCase() || "local";
  return {
    ledger,
    storage,
    kms,
    kmsName: getKms().name,
  };
}

export async function getPlatformVerifier(): Promise<{
  did: string;
  secretKeyHex: string;
  publicKeyMultibase: string;
}> {
  const sql = await getSql();
  const existing = await sql<{ did: string; secret_key_hex: string; public_key_multibase: string }>`
    select did, secret_key_hex, public_key_multibase from platform_verifiers where id = ${"platform"}`;
  if (existing[0]) {
    return {
      did: existing[0].did,
      secretKeyHex: existing[0].secret_key_hex,
      publicKeyMultibase: existing[0].public_key_multibase,
    };
  }
  const identity = createDidKeyIdentity(sealSecret);
  await sql`
    insert into platform_verifiers (id, did, secret_key_hex, public_key_multibase)
    values (${"platform"}, ${identity.did}, ${identity.sealedSecretHex}, ${identity.publicKeyMultibase})`;
  const ledger = await getLedger();
  await ledger.registerDid({
    did: identity.did,
    documentHash: identity.documentHash,
    publicKeyMultibase: identity.publicKeyMultibase,
    status: "ACTIVE",
  });
  return {
    did: identity.did,
    secretKeyHex: identity.sealedSecretHex,
    publicKeyMultibase: identity.publicKeyMultibase,
  };
}

export async function audit(input: {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sql = await getSql();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const previous = await sql<{ event_hash: string }>`
    select event_hash from audit_events
    where event_hash is not null
      and tenant_id is not distinct from ${input.tenantId ?? null}
    order by created_at desc
    limit 1`;
  const prevHash = previous[0]?.event_hash ?? AUDIT_GENESIS;
  const eventHash = auditEventHash({
    id,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata ?? {},
    createdAt,
    prevHash,
  });
  await sql`
    insert into audit_events (
      id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata_json,
      created_at, prev_hash, event_hash
    )
    values (
      ${id},
      ${input.tenantId ?? null},
      ${input.actorUserId ?? null},
      ${input.action},
      ${input.resourceType},
      ${input.resourceId ?? null},
      ${JSON.stringify(input.metadata ?? {})},
      ${createdAt},
      ${prevHash},
      ${eventHash}
    )`;
}
