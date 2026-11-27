import test from "node:test";
import assert from "node:assert/strict";
import { claimDeficiencies, validateClinicalReview } from "../lib/ehr/billing-model.ts";
import type { BillingClaim } from "../lib/ehr/billing-model.ts";

function completeClaim(): Partial<BillingClaim> {
  return {
    dateOfService: "2025-01-15",
    sessionMinutes: 53,
    diagnoses: [{ code: "F41.1", label: "Generalized anxiety disorder", rank: "primary" }],
    serviceLines: [{ code: "90837", label: "Psychotherapy 60 min", units: 1, chargeAmount: 175 }],
    providerSignature: "Jane Doe, LCSW",
    renderingProviderNpi: "1234567890",
    payerName: "Aetna",
    insurancePlanName: "Aetna Commercial",
    payerId: "60054",
    chargeAmount: 175,
  };
}

test("a complete claim has no deficiencies", () => {
  const result = claimDeficiencies(completeClaim());
  assert.equal(result.ok, true);
  assert.deepEqual(result.clinical, []);
  assert.deepEqual(result.billing, []);
  assert.deepEqual(result.all, []);
});

test("a claim missing primary diagnosis and signature names both under clinical", () => {
  const claim = completeClaim();
  delete claim.diagnoses;
  delete claim.providerSignature;
  const result = claimDeficiencies(claim);
  assert.equal(result.ok, false);
  assert.ok(result.clinical.includes("Primary diagnosis"));
  assert.ok(result.clinical.includes("Authenticated provider signature"));
  assert.ok(result.all.includes("Primary diagnosis"));
  assert.ok(result.all.includes("Authenticated provider signature"));
});

test("a claim missing payer id and charge names both under billing", () => {
  const claim = completeClaim();
  delete claim.payerId;
  delete claim.chargeAmount;
  const result = claimDeficiencies(claim);
  assert.equal(result.ok, false);
  assert.ok(result.billing.includes("Clearinghouse payer ID / routing"));
  assert.ok(result.billing.includes("Charge amount"));
});

test("all de-duplicates items that appear in both stages", () => {
  const claim = completeClaim();
  delete claim.serviceLines;
  const result = claimDeficiencies(claim);
  // service lines appear in both clinical ("At least one service...") and
  // billing ("Service line coding"); both named, no duplicate strings in all.
  assert.equal(new Set(result.all).size, result.all.length);
  assert.ok(result.clinical.includes("At least one service (CPT/HCPCS) line"));
  assert.ok(result.billing.includes("Service line coding"));
});

test("a supervisee-note claim without co-sign is blocked and named", () => {
  const claim = { ...completeClaim(), supervisorCosignRequired: true };
  const result = claimDeficiencies(claim);
  assert.equal(result.ok, false);
  assert.ok(result.clinical.includes("Supervisor co-sign required"));
  assert.ok(result.all.includes("Supervisor co-sign required"));
  assert.equal(validateClinicalReview(claim).ok, false);
});

test("a supervisee-note claim passes once the supervisor has signed", () => {
  const claim = { ...completeClaim(), supervisorCosignRequired: true, supervisorCosignedAt: "2025-01-16T15:00:00.000Z" };
  assert.equal(claimDeficiencies(claim).ok, true);
  assert.equal(validateClinicalReview(claim).ok, true);
});

test("claims without supervision flags are unchanged", () => {
  assert.equal(validateClinicalReview(completeClaim()).ok, true);
});
