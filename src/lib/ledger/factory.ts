import { getSql, type Sql } from "@/lib/db";
import type { DistributedLedgerAdapter } from "./adapter";
import { FabricLedgerAdapter } from "./fabric";
import { ledgerAdapterName } from "./gateway";
import { HashChainLedgerAdapter, type LedgerBlock, type LedgerStore } from "./hash-chain";

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

export type RuntimeLedger = DistributedLedgerAdapter & {
  listBlocks(): Promise<LedgerBlock[]>;
  integrityModel?: "hash-chain" | "fabric-endorsement";
};

export async function createLedger(): Promise<RuntimeLedger> {
  if (ledgerAdapterName() === "fabric") {
    return FabricLedgerAdapter.connect();
  }
  const sql = await getSql();
  return new HashChainLedgerAdapter(new PostgresLedgerStore(sql));
}
