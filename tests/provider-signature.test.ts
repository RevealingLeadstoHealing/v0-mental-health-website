import assert from "node:assert/strict";
import test from "node:test";
import { providerIdentifiersForName, providerNpiForName, providerSignatureText, documentSignatureText } from "../lib/ehr/provider-signature.ts";

test("uses the individual provider NPI in provider signature text", () => {
  assert.equal(providerNpiForName(" KENSEENER   CARPENTER "), "1417470964");
  assert.equal(providerSignatureText("Kenseener Carpenter"), "Kenseener Carpenter | NPI: 1417470964 | License: 103235");
  assert.equal(providerNpiForName("Another Provider"), "");
  assert.equal(providerSignatureText(""), "Not signed");
});

test("never adds a provider NPI to a patient signature", () => {
  assert.equal(documentSignatureText({ signer: "Kenseener Carpenter", authenticatedRole: "client", providerNpi: "1417470964" }), "Kenseener Carpenter");
  assert.equal(documentSignatureText({ signer: "Patient", role: "Client" }), "Patient");
});

test("renders provider signatures using saved metadata and supports older provider signatures", () => {
  assert.equal(documentSignatureText({ signer: "Kenseener Carpenter", authenticatedRole: "provider" }), "Kenseener Carpenter | NPI: 1417470964 | License: 103235");
  const saved = JSON.parse(JSON.stringify({ signer: "Kenseener Carpenter", authenticatedRole: "provider", providerNpi: providerNpiForName("Kenseener Carpenter") }));
  assert.ok(documentSignatureText(saved).includes("NPI: 1417470964"));
  assert.equal(documentSignatureText({ signer: "Another Provider", authenticatedRole: "provider" }), "Another Provider");
});


test("keeps CAQH in provider identifiers without attaching it to signatures", () => {
  const identifiers = providerIdentifiersForName("Kenseener Carpenter");
  assert.equal(identifiers.npi, "1417470964");
  assert.equal(identifiers.caqhId, "14077537");
  assert.equal(identifiers.licenseNumber, "103235");
  assert.equal(providerIdentifiersForName("Another Provider").caqhId, "");
  assert.ok(!providerSignatureText("Kenseener Carpenter").includes("14077537"));
});

test("retains the supplied CASAC credential, level and unambiguous dates", () => {
  const identifiers = providerIdentifiersForName("Kenseener Carpenter");
  assert.equal(identifiers.casacNumber, "CASAC-26242");
  assert.equal(identifiers.casacLevel, "Master Level");
  assert.equal(identifiers.casacEffectiveDate, "2025-01-03");
  assert.equal(identifiers.casacExpirationDate, "2028-01-02");
  assert.equal(providerIdentifiersForName("Another Provider").casacNumber, "");
});

test("retains the license captured with a saved signature", () => {
  assert.ok(documentSignatureText({ signer: "Kenseener Carpenter", authenticatedRole: "provider", providerLicense: "prior-license" }).endsWith("License: prior-license"));
});
