import assert from "node:assert/strict";
import { test } from "node:test";
import { ledgerAdapterName } from "./gateway";
import { FabricLedgerAdapter } from "./fabric";

test("ledger adapter defaults to hashchain", () => {
  const prev = process.env.LEDGER_ADAPTER;
  delete process.env.LEDGER_ADAPTER;
  assert.equal(ledgerAdapterName(), "hashchain");
  if (prev !== undefined) process.env.LEDGER_ADAPTER = prev;
});

test("fabric selection without env still cannot connect", () => {
  const prev = process.env.LEDGER_ADAPTER;
  process.env.LEDGER_ADAPTER = "fabric";
  assert.equal(ledgerAdapterName(), "fabric");
  assert.throws(() => FabricLedgerAdapter.connect(), /Refusing to fake/);
  if (prev !== undefined) process.env.LEDGER_ADAPTER = prev;
  else delete process.env.LEDGER_ADAPTER;
});
