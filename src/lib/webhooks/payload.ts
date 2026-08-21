import type { MachineVerification } from "@/lib/api/machine";

export function verificationEventPayload(input: {
  eventId: string;
  result: MachineVerification;
  source: "ui" | "api";
  created?: string;
}): Record<string, unknown> {
  return {
    id: input.eventId,
    type: "verification.completed",
    created: input.created ?? new Date().toISOString(),
    source: input.source,
    status: input.result.status,
    verified: input.result.verified,
    issuerDid: input.result.issuerDid,
    credentialId: input.result.credentialId,
    credentialHash: input.result.credentialHash,
    documentHash: input.result.documentHash,
    reportRef: input.result.reportRef,
    reportHash: input.result.reportHash,
    checks: input.result.checks,
    reasons: input.result.reasons,
  };
}
