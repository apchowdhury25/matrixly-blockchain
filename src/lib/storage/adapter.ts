export interface ObjectStorageAdapter {
  readonly name: string;
  put(objectName: string, bytes: Uint8Array, mime: string): Promise<void>;
  get(objectName: string): Promise<Uint8Array>;
  head(objectName: string): Promise<{ byteLength: number; mime: string } | null>;
  /** When true, the documents row still stores content_b64 (preview). */
  readonly keepsBytesInDb: boolean;
}

export function storageBackend(): "db" | "fs" | "s3" | "gcs" {
  const raw = (typeof process !== "undefined" ? process.env.STORAGE_BACKEND : undefined)?.trim().toLowerCase();
  if (raw === "fs" || raw === "s3" || raw === "gcs") return raw;
  return "db";
}
