import assert from "node:assert/strict";
import { test } from "node:test";
import { SOC2_CRITERIA, SOC2_DISCLAIMER, soc2IsCertified } from "./soc2";
import { COMPLIANCE_MATRIX } from "./matrix";

test("SOC 2 is not certified and the disclaimer does not claim an opinion", () => {
  assert.equal(soc2IsCertified(), false);
  assert.match(SOC2_DISCLAIMER, /not SOC 2/i);
  assert.equal(SOC2_DISCLAIMER.toLowerCase().includes("certified"), true);
  assert.equal(COMPLIANCE_MATRIX.find((c) => c.id === "REG-01")?.status, "not-claimed");
});

test("no Trust Services Criterion is marked as an issued report", () => {
  assert.equal(SOC2_CRITERIA.some((c) => c.coverage === "software-support" && c.id === "CC1"), false);
  assert.equal(
    SOC2_CRITERIA.every((c) => c.coverage === "software-support" || c.coverage === "organization-gap" || c.coverage === "not-in-scope"),
    true,
  );
  assert.equal(SOC2_CRITERIA.find((c) => c.id === "CC1")?.coverage, "organization-gap");
  assert.equal(SOC2_CRITERIA.find((c) => c.id === "PI1")?.coverage, "software-support");
});
