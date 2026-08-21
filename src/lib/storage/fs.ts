import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ObjectStorageAdapter } from "./adapter";

export class FilesystemObjectStore implements ObjectStorageAdapter {
  readonly name = "FilesystemObjectStore";
  readonly keepsBytesInDb = false;
  constructor(private readonly root: string) {}

  private pathFor(objectName: string): string {
    if (objectName.includes("..") || objectName.includes("/") || objectName.includes("\\")) {
      throw new Error("Invalid object name");
    }
    return join(this.root, objectName);
  }

  async put(objectName: string, bytes: Uint8Array, _mime: string): Promise<void> {
    const path = this.pathFor(objectName);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }

  async get(objectName: string): Promise<Uint8Array> {
    const buf = await readFile(this.pathFor(objectName));
    return new Uint8Array(buf);
  }

  async head(objectName: string): Promise<{ byteLength: number; mime: string } | null> {
    try {
      const info = await stat(this.pathFor(objectName));
      return { byteLength: info.size, mime: "application/octet-stream" };
    } catch {
      return null;
    }
  }
}
