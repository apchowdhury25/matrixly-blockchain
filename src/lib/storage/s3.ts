import type { ObjectStorageAdapter } from "./adapter";

export class S3ObjectStore implements ObjectStorageAdapter {
  readonly name = "S3ObjectStore";
  readonly keepsBytesInDb = false;
  constructor(private readonly bucket?: string) {}

  private refuse(): never {
    throw new Error(
      `S3ObjectStore is not connected${this.bucket ? ` (bucket ${this.bucket})` : ""}. ` +
        "Configure S3_BUCKET and credentials, then swap this adapter in. " +
        "Refusing to fake object storage.",
    );
  }

  async put(): Promise<void> {
    this.refuse();
  }
  async get(): Promise<Uint8Array> {
    this.refuse();
  }
  async head(): Promise<{ byteLength: number; mime: string } | null> {
    this.refuse();
  }
}
