import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultTelehealthCoding,
  PRACTICE_BILLING_IDENTITY,
  RENDERING_PROVIDER,
} from "../lib/ehr/billing-settings.ts";

test("defaultTelehealthCoding maps the appointment format to POS + modifier", () => {
  assert.deepEqual(defaultTelehealthCoding("Telehealth"), { placeOfService: "10", modifiers: ["95"] });
  assert.deepEqual(defaultTelehealthCoding("Phone"), { placeOfService: "02", modifiers: ["93"] });
  assert.deepEqual(defaultTelehealthCoding("In Person"), { placeOfService: "11", modifiers: [] });
  assert.deepEqual(defaultTelehealthCoding(undefined), { placeOfService: "11", modifiers: [] });
  // Case-insensitive on the format string.
  assert.deepEqual(defaultTelehealthCoding("telehealth"), { placeOfService: "10", modifiers: ["95"] });
});

test("the practice billing identity is pre-filled with the solo-individual defaults", () => {
  assert.equal(PRACTICE_BILLING_IDENTITY.organizationName, "REVEALING LEADS TO HEALING WELLNESS SERVICES, LLC");
  assert.equal(PRACTICE_BILLING_IDENTITY.npi, "1417470964");
  assert.equal(PRACTICE_BILLING_IDENTITY.ein, "873646733");
  assert.equal(PRACTICE_BILLING_IDENTITY.taxonomyCode, "1041C0700X");
  assert.equal(PRACTICE_BILLING_IDENTITY.state, "NY");
  assert.equal(PRACTICE_BILLING_IDENTITY.postalCode, "107030000");
  // Solo / sole-proprietor: no separate Type 2 (organization) NPI.
  assert.equal(PRACTICE_BILLING_IDENTITY.type2Npi, "");
  assert.equal(RENDERING_PROVIDER.npi, "1417470964");
  assert.equal(RENDERING_PROVIDER.license, "103235");
  assert.equal(RENDERING_PROVIDER.caqhId, "14077537");
});

test("an EHR_BILLING_* env var overrides a single field, leaving the rest at defaults", async () => {
  process.env.EHR_BILLING_ORG_NAME = "Override Wellness LLC";
  // Dynamic import with a cache-busting query so the module re-reads process.env.
  const mod = await import("../lib/ehr/billing-settings.ts?override=1");
  assert.equal(mod.PRACTICE_BILLING_IDENTITY.organizationName, "Override Wellness LLC");
  // Unset fields keep the owner defaults.
  assert.equal(mod.PRACTICE_BILLING_IDENTITY.npi, "1417470964");
  assert.equal(mod.PRACTICE_BILLING_IDENTITY.ein, "873646733");
  delete process.env.EHR_BILLING_ORG_NAME;
});
