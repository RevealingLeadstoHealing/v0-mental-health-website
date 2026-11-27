import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildEligibilityRequest,
  eligibilityNotes,
  eligibilitySubscriberFromProfile,
  eligibilityVerificationStatus,
  isValidPayerId,
  runEligibilityCheck,
  summarizeEligibilityResponse,
} from "../lib/ehr/eligibility.ts";
import { documentStorageKey, normalizeDocumentType } from "../lib/ehr/document-storage.ts";
import { editableDemographicFields } from "../lib/ehr/patient-demographics.ts";

const profile = { fullName: "Test Patient", dateOfBirth: "1980-01-02", insuranceMemberId: "M123" };
const provider = { organizationName: "Example Wellness LLC", npi: "1999999984" };

test("eligibility request uses the patient's name, DOB, member ID and practice NPI", () => {
  const { subscriber, missing } = eligibilitySubscriberFromProfile(profile);
  assert.deepEqual(missing, []);
  const body = buildEligibilityRequest("87726", provider, subscriber);
  assert.equal(body.payerId, "87726");
  assert.equal(body.provider.npi, "1999999984");
  assert.deepEqual(body.subscriber.name.person, { firstName: "Test", lastName: "Patient" });
  assert.equal(body.subscriber.dateOfBirth, "1980-01-02");
  assert.equal(body.subscriber.memberId, "M123");
});

test("eligibility refuses to run without member ID or DOB", () => {
  const { missing } = eligibilitySubscriberFromProfile({ fullName: "Test Patient" });
  assert.ok(missing.includes("Patient date of birth"));
  assert.ok(missing.includes("Insurance member ID"));
  assert.ok(isValidPayerId("87726"));
  assert.ok(!isValidPayerId("uhc payer"));
});

test("active coverage response is summarized and marked Verified", () => {
  const summary = summarizeEligibilityResponse({
    id: "ec_1",
    plans: [{ name: "Choice Plus", benefits: {
      statuses: [{ status: "ACTIVE_COVERAGE", network: { indicator: "IN_NETWORK" } }],
      coPayment: [{ amount: "30", network: { indicator: "IN_NETWORK" }, service: { definition: "Mental Health" } }],
    } }],
  });
  assert.equal(summary.coverage, "active");
  assert.equal(summary.planName, "Choice Plus");
  assert.deepEqual(summary.coPayments, ["Mental Health: $30 (in network)"]);
  assert.equal(eligibilityVerificationStatus(summary), "Verified");
  assert.match(eligibilityNotes(summary, "87726", "2026-09-30T00:00:00Z"), /payer ID 87726, 2026-09-30: coverage active/);
});

test("payer rejections and inactive coverage are never marked Verified", () => {
  const rejected = summarizeEligibilityResponse({ errors: [{ code: "75", description: "Subscriber Not Found", followupAction: "Please Correct and Resubmit" }] });
  assert.equal(eligibilityVerificationStatus(rejected), "Pending");
  assert.deepEqual(rejected.errors, ["75: Subscriber Not Found — Please Correct and Resubmit"]);
  const inactive = summarizeEligibilityResponse({ plans: [{ benefits: { statuses: [{ status: "INACTIVE" }] } }] });
  assert.equal(eligibilityVerificationStatus(inactive), "Not verified");
});

test("eligibility call authenticates with the Stedi key and surfaces HTTP failures", async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const ok = async (url: string, init: RequestInit) => {
    seen = { url, init };
    return new Response(JSON.stringify({ plans: [{ benefits: { statuses: [{ status: "ACTIVE_COVERAGE" }] } }] }), { status: 200 });
  };
  const request = buildEligibilityRequest("87726", provider, eligibilitySubscriberFromProfile(profile).subscriber);
  const summary = await runEligibilityCheck(request, "secret_key", ok);
  assert.equal(summary.coverage, "active");
  assert.equal(seen?.url, "https://healthcare.us.stedi.com/2026-06-01/eligibility-check");
  assert.equal((seen?.init.headers as Record<string, string>).Authorization, "Key secret_key");
  const failing = async () => new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  await assert.rejects(runEligibilityCheck(request, "bad", failing), /Unauthorized/);
});

test("insurance card and photo ID uploads are stored as insurance documents", () => {
  assert.equal(normalizeDocumentType("insurance-card-front"), "insurance");
  assert.equal(normalizeDocumentType("photo-id-back"), "insurance");
  assert.equal(normalizeDocumentType("consent"), "consent");
  assert.equal(normalizeDocumentType("Clinical Document"), "other");
  assert.equal(documentStorageKey("p1", "c/1", "insurance", "document_1", "card front.jpg"), "ehr-documents/p1/client-c_1/insurance/document_1-card_front.jpg");
});

test("image uploads fall back to the server route when direct S3 upload is blocked", () => {
  const ui = readFileSync(new URL("../app/ehr/full-production-interface.tsx", import.meta.url), "utf8");
  assert.match(ui, /async function uploadChartFile/);
  assert.match(ui, /"\/api\/ehr\/documents\/upload"/);
  assert.equal((ui.match(/fetch\(authorization\.uploadUrl/g) || []).length, 1);
  const route = readFileSync(new URL("../app/api/ehr/documents/upload/route.ts", import.meta.url), "utf8");
  assert.match(route, /ServerSideEncryption: "aws:kms"/);
  assert.match(route, /Clients can only upload documents to their own chart/);
  const foundation = readFileSync(new URL("../infra/aws/rlth-ehr-foundation.yaml", import.meta.url), "utf8");
  const bucket = foundation.slice(foundation.indexOf("EhrDocumentsBucket:"), foundation.indexOf("EhrDocumentsBucketPolicy:"));
  assert.match(bucket, /CorsConfiguration:/);
});

test("signing is one form at a time and cannot be double-submitted", () => {
  const ui = readFileSync(new URL("../app/ehr/full-production-interface.tsx", import.meta.url), "utf8");
  assert.match(ui, /if \(signingInProgressRef\.current\) return;/);
  assert.match(ui, /Form \{signatureDocumentPosition\} of \{signatureDocumentsInOrder\.length\}/);
  assert.match(ui, /sort\(\(a, b\) => consentOrderIndex\(a\) - consentOrderIndex\(b\)\)\.find\(stillNeedsSignature\)/);
  assert.ok(editableDemographicFields.includes("insurancePayerId"));
});
