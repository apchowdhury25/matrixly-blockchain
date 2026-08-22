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
});
