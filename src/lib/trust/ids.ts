import { randomBytes, randomUUID } from "node:crypto";

export { DEMO } from "./demo";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

export function opaqueRef(): string {
  return randomBytes(9).toString("base64url");
}
