import assert from "node:assert/strict";
import { test } from "node:test";
import { AUDIT_GENESIS, auditEventHash, verifyAuditSequence } from "./chain";

test("audit hash chain detects a mutated event", () => {
  const a = {
    id: "1",
    action: "credential.verified",
    resourceType: "credential",
    resourceId: "urn:uuid:a",
    metadata: { status: "VALID" },
    createdAt: "2026-08-21T00:00:00.000Z",
    prevHash: AUDIT_GENESIS,
    eventHash: "",
  };
  a.eventHash = auditEventHash(a);
  const b = {
    id: "2",
    action: "credential.revoked",
    resourceType: "credential",
    resourceId: "urn:uuid:a",
    metadata: {},
    createdAt: "2026-08-21T01:00:00.000Z",
    prevHash: a.eventHash,
    eventHash: "",
  };
  b.eventHash = auditEventHash(b);
  assert.equal(verifyAuditSequence([a, b]).valid, true);
  const tampered = { ...b, metadata: { hidden: true }, eventHash: b.eventHash };
  assert.equal(verifyAuditSequence([a, tampered]).valid, false);
});
