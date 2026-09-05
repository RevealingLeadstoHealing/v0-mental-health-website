import test from "node:test";
import assert from "node:assert/strict";
import { payerCatalog } from "../lib/ehr/payer-catalog.ts";

test("New York and Florida billing catalogs remain separate and comprehensive", () => {
  assert.ok(payerCatalog.NY.length >= 18);
  assert.ok(payerCatalog.FL.length >= 13);
  assert.ok(payerCatalog.NY.every(group => group.products.length > 0));
  assert.ok(payerCatalog.FL.every(group => group.products.length > 0));
});

test("Aetna products remain separated within each state", () => {
  const ny = payerCatalog.NY.find(group => group.id === "aetna");
  const fl = payerCatalog.FL.find(group => group.id === "aetna-fl");
  assert.deepEqual(new Set(ny?.products.map(product => product.type)), new Set(["Commercial", "Medicaid", "Medicare"]));
  assert.deepEqual(new Set(fl?.products.map(product => product.type)), new Set(["Commercial", "Medicaid", "Marketplace", "Medicare"]));
});

test("public plan types are independent selectable products", () => {
  const anthem = payerCatalog.NY.find(group => group.id === "anthem-empire");
  assert.ok(anthem?.products.some(product => product.type === "Medicaid"));
  assert.ok(anthem?.products.some(product => product.type === "Essential Plan"));
  assert.ok(anthem?.products.some(product => product.type === "Child Health Plus"));
  assert.ok(anthem?.products.some(product => product.type === "Medicare"));
});
