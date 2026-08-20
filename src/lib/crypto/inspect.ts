export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type InspectedFile = {
  mime: string;
  kind: "pdf" | "json" | "png" | "jpeg";
  byteLength: number;
};

const PDF = [0x25, 0x50, 0x44, 0x46]; // %PDF
const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.byteLength < magic.length) return false;
  return magic.every((b, i) => bytes[i] === b);
}

/**
 * Content inspection. Filename, declared MIME, and extension are ignored.
 * ZIP/executables and unknown types are rejected.
 */
export function inspectBytes(bytes: Uint8Array): InspectedFile {
  if (bytes.byteLength === 0) throw new Error("Empty file");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(`File exceeds ${MAX_UPLOAD_BYTES} byte limit`);
  }
  if (startsWith(bytes, PDF)) {
    return { mime: "application/pdf", kind: "pdf", byteLength: bytes.byteLength };
  }
  if (startsWith(bytes, PNG)) {
    return { mime: "image/png", kind: "png", byteLength: bytes.byteLength };
  }
  if (startsWith(bytes, JPEG)) {
    return { mime: "image/jpeg", kind: "jpeg", byteLength: bytes.byteLength };
  }
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 64)).trimStart();
  if (head.startsWith("{") || head.startsWith("[")) {
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return { mime: "application/json", kind: "json", byteLength: bytes.byteLength };
  }
  throw new Error("Unsupported or unrecognizable file content");
}

export function randomObjectName(kind: InspectedFile["kind"]): string {
  const ext = kind === "jpeg" ? "jpg" : kind;
  const stamp = crypto.randomUUID().replaceAll("-", "");
  return `${stamp}.${ext}`;
}
