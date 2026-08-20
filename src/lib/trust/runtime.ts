import { getSql, type Sql } from "@/lib/db";
import {
  HashChainLedgerAdapter,
  type LedgerBlock,
  type LedgerStore,
} from "@/lib/ledger/hash-chain";
import type { DistributedLedgerAdapter } from "@/lib/ledger/adapter";

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

export async function audit(input: {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into audit_events (id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata_json)
    values (
      ${crypto.randomUUID()},
      ${input.tenantId ?? null},
      ${input.actorUserId ?? null},
      ${input.action},
      ${input.resourceType},
      ${input.resourceId ?? null},
      ${JSON.stringify(input.metadata ?? {})}
    )`;
}
