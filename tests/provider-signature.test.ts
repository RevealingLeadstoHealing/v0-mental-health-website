import assert from "node:assert/strict";
import test from "node:test";
import { providerIdentifiersForName, providerNpiForName, providerSignatureText, documentSignatureText, credentialRenewalAlerts } from "../lib/ehr/provider-signature.ts";
import { webadorReminderActive } from "../lib/ehr/webador-reminder.ts";

const OWNER = "Kenseener Carpenter";

test("CASAC renewal alert still fires inside the 90-day window", () => {
  const alerts = credentialRenewalAlerts(OWNER, new Date("2027-12-01T12:00:00"));
  assert.ok(alerts.some(a => a.id === "casac" && a.severity === "due_soon"));
  assert.ok(!credentialRenewalAlerts(OWNER, new Date("2026-11-06T12:00:00")).some(a => a.id === "casac"));
});

test("state license alerts: estimated NY, Idaho window, expired, and Florida standing reminder", () => {
  const ny = credentialRenewalAlerts(OWNER, new Date("2029-04-01T12:00:00")).find(a => a.id === "license-ny");
  assert.ok(ny && ny.severity === "due_soon" && ny.message.includes("(estimated)"));
  const id = credentialRenewalAlerts(OWNER, new Date("2028-10-01T12:00:00")).find(a => a.id === "license-id");
  assert.ok(id && id.severity === "due_soon" && !id.message.includes("(estimated)"));
  const expired = credentialRenewalAlerts(OWNER, new Date("2029-01-01T12:00:00")).find(a => a.id === "license-id");
  assert.equal(expired?.severity, "expired");
  const fl = credentialRenewalAlerts(OWNER, new Date("2026-11-06T12:00:00")).find(a => a.id === "license-fl-no-expiration");
  assert.equal(fl?.severity, "reminder");
  assert.equal(fl?.message, "Florida telehealth registration expiration date not on file — look it up and record it");
  assert.deepEqual(credentialRenewalAlerts("Another Provider"), []);
});

test("December Webador reminder shows only 2026-12-09 through 2026-12-16", () => {
  assert.equal(webadorReminderActive(new Date("2026-12-08T23:59:00")), false);
  assert.equal(webadorReminderActive(new Date("2026-12-09T00:00:00")), true);
  assert.equal(webadorReminderActive(new Date("2026-12-16T23:59:00")), true);
  assert.equal(webadorReminderActive(new Date("2026-12-17T00:00:00")), false);
});

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
