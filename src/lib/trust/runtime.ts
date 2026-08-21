import { getSql, type Sql } from "@/lib/db";
import {
  HashChainLedgerAdapter,
  type LedgerBlock,
  type LedgerStore,
} from "@/lib/ledger/hash-chain";
import type { DistributedLedgerAdapter } from "@/lib/ledger/adapter";
import { AUDIT_GENESIS, auditEventHash } from "@/lib/audit/chain";
import { createDidKeyIdentity } from "@/lib/identity/keys";
import { sealSecret } from "./seal";

class PostgresLedgerStore implements LedgerStore {
  constructor(private sql: Sql) {}
  async append(block: LedgerBlock): Promise<void> {
    await this.sql`
      insert into ledger_blocks (seq, previous_hash, payload_json, payload_hash, block_hash, timestamp_iso)
      values (
        ${block.seq},
        ${block.previousHash},
        ${JSON.stringify(block.payload)},
        ${block.payloadHash},
        ${block.blockHash},
        ${block.timestamp}
      )`;
  }
  async all(): Promise<LedgerBlock[]> {
    const rows = await this.sql<{
      seq: number;
      previous_hash: string;
      payload_json: string;
      payload_hash: string;
      block_hash: string;
      timestamp_iso: string;
    }>`select seq, previous_hash, payload_json, payload_hash, block_hash, timestamp_iso
       from ledger_blocks order by seq asc`;
    return rows.map((r) => ({
      seq: Number(r.seq),
      previousHash: r.previous_hash,
      payload: JSON.parse(r.payload_json) as LedgerBlock["payload"],
      payloadHash: r.payload_hash,
      blockHash: r.block_hash,
      timestamp: r.timestamp_iso,
    }));
  }
}

export async function getLedger(): Promise<DistributedLedgerAdapter & { listBlocks(): Promise<LedgerBlock[]> }> {
  const sql = await getSql();
  return new HashChainLedgerAdapter(new PostgresLedgerStore(sql));
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
