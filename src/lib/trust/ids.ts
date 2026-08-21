import { randomBytes, randomUUID } from "node:crypto";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

export function opaqueRef(): string {
  return randomBytes(9).toString("base64url");
}

export const DEMO = {
  tenantId: "tenant_platform_demo",
  orgId: "org_global_university",
  issuerId: "iss_registrar",
  validRef: "demo-valid-bcs",
  revokedRef: "demo-revoked-bcs",
  expiredRef: "demo-expired-bcs",
  claimToken: "demo-claim-valid-bcs",
  apiKey: "mtx_live_demo_verifier_qa_only",
  apiKeyId: "key_demo_verifier",
  tamperedDocId: "doc_tampered_demo",
  statusListId: "https://trust.matrixly.ai/credentials/status/demo",
  webHost: "matrixly.example.test",
  webSlug: "global-university",
  webDid: "did:web:matrixly.example.test:issuers:global-university",
  webRef: "demo-valid-didweb",
} as const;
