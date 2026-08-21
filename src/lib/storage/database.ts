import type { Sql } from "@/lib/db";
import type { ObjectStorageAdapter } from "./adapter";

/** Preview store: bytes live in documents.content_b64, still off the ledger. */
export class DatabaseObjectStore implements ObjectStorageAdapter {
  readonly name = "DatabaseObjectStore";
  readonly keepsBytesInDb = true;
  constructor(private sql: Sql) {}

  async put(objectName: string, bytes: Uint8Array, mime: string): Promise<void> {
    const b64 = Buffer.from(bytes).toString("base64");
    await this.sql`
      insert into object_blobs (object_name, mime, content_b64)
      values (${objectName}, ${mime}, ${b64})
      on conflict (object_name) do update set mime = excluded.mime, content_b64 = excluded.content_b64`;
  }

  async get(objectName: string): Promise<Uint8Array> {
    const blobs = await this.sql<{ content_b64: string }>`
      select content_b64 from object_blobs where object_name = ${objectName}`;
    if (blobs[0]) return Uint8Array.from(Buffer.from(blobs[0].content_b64, "base64"));
    const docs = await this.sql<{ content_b64: string }>`
      select content_b64 from documents where object_name = ${objectName} and content_b64 is not null limit 1`;
    if (!docs[0]?.content_b64) throw new Error(`Object ${objectName} not found in database store`);
    return Uint8Array.from(Buffer.from(docs[0].content_b64, "base64"));
  }

  async head(objectName: string): Promise<{ byteLength: number; mime: string } | null> {
    const blobs = await this.sql<{ mime: string; content_b64: string }>`
      select mime, content_b64 from object_blobs where object_name = ${objectName}`;
    if (blobs[0]) {
      return { mime: blobs[0].mime, byteLength: Buffer.from(blobs[0].content_b64, "base64").byteLength };
    }
    const docs = await this.sql<{ mime: string; byte_length: number }>`
      select mime, byte_length from documents where object_name = ${objectName} limit 1`;
    if (!docs[0]) return null;
    return { mime: docs[0].mime, byteLength: Number(docs[0].byte_length) };
  }
}
