import { sha256Utf8 } from "../crypto/hash";
import { canonicalize } from "../crypto/jcs";
import type { DistributedLedgerAdapter, SchemaLedgerRecord } from "../ledger/adapter";
import { UNIVERSITY_DEGREE_SCHEMA, UNIVERSITY_DEGREE_SCHEMA_ID } from "./university-degree";

export function schemaDocumentHash(schema: object = UNIVERSITY_DEGREE_SCHEMA): string {
  return sha256Utf8(canonicalize(schema)).prefixed;
}

export function publishedSchemaRecord(): SchemaLedgerRecord {
  return {
    schemaId: UNIVERSITY_DEGREE_SCHEMA_ID,
    schemaHash: schemaDocumentHash(),
    schemaType: "JsonSchema",
    status: "ACTIVE",
  };
}

export function expectedSchemaHash(schemaId: string): string | null {
  if (schemaId === UNIVERSITY_DEGREE_SCHEMA_ID) return schemaDocumentHash();
  return null;
}

export async function registerPublishedSchema(ledger: DistributedLedgerAdapter) {
  const rec = publishedSchemaRecord();
  await ledger.registerSchema(rec);
  const found = await ledger.getSchema(rec.schemaId);
  if (!found || found.schemaHash !== rec.schemaHash) {
    throw new Error("Published JsonSchema was not persisted on the ledger");
  }
  return found;
}
