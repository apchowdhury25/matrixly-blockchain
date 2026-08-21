import { canonicalize } from "../crypto/jcs";
import { sha256Utf8 } from "../crypto/hash";

export const AUDIT_GENESIS =
  "sha256:0000000000000000000000000000000000000000000000000000000000000000";

export type AuditLink = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  prevHash: string;
};

export function auditEventHash(link: AuditLink): string {
  return sha256Utf8(
    canonicalize({
      id: link.id,
      action: link.action,
      resourceType: link.resourceType,
      resourceId: link.resourceId,
      metadata: link.metadata,
      createdAt: link.createdAt,
      prevHash: link.prevHash,
    }),
  ).prefixed;
}

export function verifyAuditSequence(
  events: Array<AuditLink & { eventHash: string }>,
): { valid: boolean; length: number; reason?: string } {
  let prev = AUDIT_GENESIS;
  for (const event of events) {
    if (event.prevHash !== prev) {
      return { valid: false, length: events.length, reason: `Broken audit link at ${event.id}` };
    }
    const expected = auditEventHash(event);
    if (expected !== event.eventHash) {
      return { valid: false, length: events.length, reason: `Audit payload mismatch at ${event.id}` };
    }
    prev = event.eventHash;
  }
  return { valid: true, length: events.length };
}
