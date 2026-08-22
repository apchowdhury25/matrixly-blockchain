import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPLIANCE_MATRIX } from "./matrix";

test("matrix does not claim SOC 2 / ISO / eIDAS certification", () => {
  const reg = COMPLIANCE_MATRIX.find((c) => c.id === "REG-01");
  assert.equal(reg?.status, "not-claimed");
  assert.equal(
    COMPLIANCE_MATRIX.every((c) => c.status !== "implemented" || !c.control.toLowerCase().includes("certified")),
    true,
  );
});

test("Fabric control is fail-closed, not implemented-as-live", () => {
  const fabric = COMPLIANCE_MATRIX.find((c) => c.id === "DLT-02");
  assert.equal(fabric?.status, "fail-closed");
});

test("OpenID4VP is implemented; HAIP is not claimed", () => {
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "OID-01")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "OID-02")?.status, "not-claimed");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "OID-03")?.status, "implemented");
});

test("status list URL resolution and JsonSchema are implemented", () => {
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "STS-02")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "SCH-01")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "SCH-02")?.status, "implemented");
});

test("tenant isolation, rate limit, and readiness are implemented", () => {
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "TEN-01")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "TEN-02")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "API-02")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "OPS-01")?.status, "implemented");
});

test("schema instance validation, ledger export, and legal notice are implemented", () => {
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "SCH-03")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "DLT-03")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "DLT-04")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "DLT-05")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "DLT-06")?.status, "implemented");
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "LGL-01")?.status, "implemented");
});
