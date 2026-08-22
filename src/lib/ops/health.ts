import { getSql } from "@/lib/db";
import { createLedger } from "@/lib/ledger/factory";
import { UNIVERSITY_DEGREE_SCHEMA_ID } from "@/lib/schema/university-degree";
import { schemaDocumentHash } from "@/lib/schema/anchor";
import { runtimeAdapterStatus } from "@/lib/trust/runtime";

export function liveness() {
  return { status: "ok" as const, service: "matrixly-trust" };
}

export async function readiness(): Promise<{
  ready: boolean;
  db: boolean;
  ledger: string;
  storage: string;
  kms: string;
  reason?: string;
}> {
  const adapters = runtimeAdapterStatus();
  const base = { ledger: adapters.ledger, storage: adapters.storage, kms: adapters.kms };
  let db = false;
  try {
    const sql = await getSql();
    const rows = await sql<{ ok: number }>`select 1 as ok`;
    db = Number(rows[0]?.ok) === 1;
  } catch (err) {
    return { ready: false, db: false, ...base, reason: (err as Error).message };
  }
  try {
    const ledger = await createLedger();
    const rec = await ledger.getSchema(UNIVERSITY_DEGREE_SCHEMA_ID);
    const expected = schemaDocumentHash();
    const schemaAnchored = Boolean(rec && rec.schemaHash === expected && rec.status === "ACTIVE");
    return { ready: db, db, ...base, schemaAnchored };
  } catch (err) {
    return {
      ready: false,
      db,
      ...base,
      reason: (err as Error).message,
    };
  }
  return { ready: db, db, ...base };
}
