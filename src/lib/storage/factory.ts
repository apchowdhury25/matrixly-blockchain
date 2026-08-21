import { getSql } from "@/lib/db";
import type { ObjectStorageAdapter } from "./adapter";
import { storageBackend } from "./adapter";
import { DatabaseObjectStore } from "./database";
import { FilesystemObjectStore } from "./fs";
import { S3ObjectStore } from "./s3";

export async function getStorage(): Promise<ObjectStorageAdapter> {
  const backend = storageBackend();
  if (backend === "s3") {
    const bucket = typeof process !== "undefined" ? process.env.S3_BUCKET?.trim() : undefined;
    if (!bucket) {
      throw new Error("STORAGE_BACKEND=s3 requires S3_BUCKET. Refusing to fake object storage.");
    }
    return new S3ObjectStore(bucket);
  }
  if (backend === "gcs") {
    throw new Error("STORAGE_BACKEND=gcs is not wired. Refusing to fake GCS.");
  }
  if (backend === "fs") {
    const root = typeof process !== "undefined" ? process.env.STORAGE_PATH?.trim() : undefined;
    if (!root) {
      throw new Error("STORAGE_BACKEND=fs requires STORAGE_PATH. Refusing to write to an implicit directory.");
    }
    return new FilesystemObjectStore(root);
  }
  return new DatabaseObjectStore(await getSql());
}
