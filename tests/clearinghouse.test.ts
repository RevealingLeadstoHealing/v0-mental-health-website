import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildConnectionCheckClaim,
  buildProfessionalClaimSubmission,
  parseClearinghouseConfig,
  patientBillingDetailsFromProfile,
  patientControlNumberForClaim,
  submitProfessionalClaim,
  validateProfessionalClaim,
} from "../lib/ehr/clearinghouse.ts";

const provider = {
  organizationName: "Example Wellness LLC",
  npi: "1999999984",
  ein: "123456789",
  taxonomyCode: "101YM0800X",
  addressLine1: "1 Example Ave",
  city: "New York",
  state: "NY",
  postalCode: "100010000",
  phoneNumber: "2125550100",
};
const secret = JSON.stringify({ apiKey: "test_key", mode: "test", billingProvider: { ...provider, npi: "1999999984", ein: "12-3456789", phoneNumber: "(212) 555-0100", postalCode: "10001-0000" } });

test("clearinghouse secret parses and normalizes practice billing identity", () => {
  const { config, missing } = parseClearinghouseConfig(secret);
  assert.deepEqual(missing, []);
  assert.equal(config?.mode, "test");
  assert.equal(config?.billingProvider.ein, "123456789");
  assert.equal(config?.billingProvider.phoneNumber, "2125550100");
});

test("missing billingProvider fields fall back to the practice billing identity", () => {
  // A secret that carries only apiKey + mode (the production Stedi secret shape)
  // must still yield a complete, valid config using the configurable defaults.
  const { config, missing } = parseClearinghouseConfig(
    JSON.stringify({ apiKey: "test_key", mode: "test", billingProvider: { phoneNumber: "9145550100" } })
  );
  assert.deepEqual(missing, []);
  assert.equal(config?.mode, "test");
  assert.equal(config?.billingProvider.organizationName, "REVEALING LEADS TO HEALING WELLNESS SERVICES, LLC");
  assert.equal(config?.billingProvider.npi, "1417470964");
  assert.equal(config?.billingProvider.ein, "873646733");
  assert.equal(config?.billingProvider.taxonomyCode, "1041C0700X");
  assert.equal(config?.billingProvider.postalCode, "107030000");
  assert.equal(config?.billingProvider.type2Npi, undefined);
});

test("clearinghouse secret reports fields that come only from the secret", () => {
  // apiKey and mode come only from the secret (never from the settings defaults),
  // so an empty secret still reports those as missing even though the full billing
  // identity (org/NPI/EIN/taxonomy/address/phone) now fills from the defaults.
  const { config, missing } = parseClearinghouseConfig(JSON.stringify({ apiKey: "", billingProvider: {} }));
  assert.equal(config, undefined);
  assert.ok(missing.includes("Stedi API key"));
  assert.ok(missing.includes('Mode ("test" or "production")'));
  // These now resolve from PRACTICE_BILLING_IDENTITY, so they are NOT reported.
  assert.ok(!missing.includes("Billing provider NPI (10 digits)"));
  assert.ok(!missing.includes("Billing provider EIN (9 digits)"));
  assert.ok(!missing.includes("Billing provider phone number"));
  assert.deepEqual(parseClearinghouseConfig("not json").missing, ["Clearinghouse secret must be valid JSON"]);
});

test("a secret with only apiKey + mode is a complete, valid connection (production secret shape)", () => {
  // This is the exact shape of the production Stedi secret: no billingProvider at
  // all. With the settings fallback it must parse to a connected test config.
  const { config, missing } = parseClearinghouseConfig(JSON.stringify({ apiKey: "test_key", mode: "test" }));
  assert.deepEqual(missing, []);
  assert.equal(config?.mode, "test");
  assert.equal(config?.billingProvider.phoneNumber, "9146352687");
  assert.equal(config?.billingProvider.npi, "1417470964");
});

test("patient demographics require insurance-card fields before a claim can be sent", () => {
  const { missing } = patientBillingDetailsFromProfile({ fullName: "Jane Doe" });
  assert.ok(missing.includes("Patient date of birth"));
  assert.ok(missing.includes("Insurance member ID"));
  const ok = patientBillingDetailsFromProfile({
    fullName: "Jane Q Doe", dateOfBirth: "1990-01-01", sex: "Female", addressLine1: "1 Test St",
    city: "New York", state: "ny", zipCode: "10001", insuranceMemberId: "ABC123",
  });
  assert.deepEqual(ok.missing, []);
  assert.equal(ok.patient.firstName, "Jane Q");
  assert.equal(ok.patient.lastName, "Doe");
  assert.equal(ok.patient.state, "NY");
});

test("patient control number is stable per claim and within the 17-character limit", () => {
  const pcn = patientControlNumberForClaim("claim-abc");
  assert.match(pcn, /^[0-9A-Z]{17}$/);
  assert.equal(pcn, patientControlNumberForClaim("claim-abc"));
  assert.notEqual(pcn, patientControlNumberForClaim("claim-xyz"));
});

test("internal claim maps to Stedi professional claim JSON", () => {
  const { claim, patient } = buildConnectionCheckClaim(provider, "2026-09-29");
  const payload = buildProfessionalClaimSubmission(claim, patient, provider);
  assert.equal(payload.payer.id, "60054");
  assert.equal(payload.encounter.primaryDiagnosisCode, "F411");
  assert.equal(payload.billing.totalCharge, "150.00");
  assert.equal(payload.billing.taxId.ein, "123456789");
  assert.equal(payload.serviceLines[0].procedureCode.code, "90837");
  assert.equal(payload.serviceLines[0].renderingProvider.identifiers.npi, provider.npi);
  assert.deepEqual(payload.serviceLines[0].datesOfService, { start: "2026-09-29", end: "2026-09-29" });
});

test("in-office claim (no POS/modifier) keeps today's service-line shape", () => {
  const { claim, patient } = buildConnectionCheckClaim(provider, "2026-09-29");
  const payload = buildProfessionalClaimSubmission(claim, patient, provider);
  const line = payload.serviceLines[0] as Record<string, unknown>;
  assert.equal(line.placeOfService, undefined);
  assert.deepEqual(line.procedureCode, { code: "90837" });
});

test("solo billing uses the individual NPI as the billing provider NPI", () => {
  const { claim, patient } = buildConnectionCheckClaim(provider, "2026-09-29");
  const payload = buildProfessionalClaimSubmission(claim, patient, provider);
  assert.equal(payload.billing.billingProvider.identifiers.npi, provider.npi);
  const orgPayload = buildProfessionalClaimSubmission(claim, patient, { ...provider, type2Npi: "1234567893" });
  assert.equal(orgPayload.billing.billingProvider.identifiers.npi, "1234567893");
});

test("telehealth POS and modifier flow onto the service line", () => {
  const { claim, patient } = buildConnectionCheckClaim(provider, "2026-09-29");
  const telehealthClaim = {
    ...claim,
    placeOfService: "10",
    serviceLines: [{ ...claim.serviceLines[0], placeOfService: "10", modifiers: ["95"] }],
  };
  const payload = buildProfessionalClaimSubmission(telehealthClaim, patient, provider);
  const line = payload.serviceLines[0] as Record<string, unknown>;
  assert.equal(line.placeOfService, "10");
  assert.deepEqual(line.procedureCode, { code: "90837", procedureModifiers: ["95"] });
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("submission sends the API key and idempotency key and returns Stedi ids", async () => {
  const { claim, patient } = buildConnectionCheckClaim(provider, "2026-09-29");
  const payload = buildProfessionalClaimSubmission(claim, patient, provider);
  let seen: { url: string; headers: Record<string, string> } | null = null;
  const result = await submitProfessionalClaim(payload, "test_key", "claim-1", async (url, init) => {
    seen = { url, headers: init.headers as Record<string, string> };
    return jsonResponse(201, { claimId: "stedi-1", submissionId: "sub-1" });
  });
  assert.equal(result.accepted, true);
  assert.equal(result.stediClaimId, "stedi-1");
  assert.equal(seen!.headers.Authorization, "Key test_key");
  assert.equal(seen!.headers["Idempotency-Key"], "claim-1");
  assert.match(seen!.url, /\/professional-claim-submissions$/);
});

test("HTTP 201 with edit errors is treated as a rejection, not a transmission", async () => {
  const { claim, patient } = buildConnectionCheckClaim(provider, "2026-09-29");
  const payload = buildProfessionalClaimSubmission(claim, patient, provider);
  const result = await submitProfessionalClaim(payload, "k", "claim-1", async () =>
    jsonResponse(201, { claimId: "stedi-2", errors: [{ description: "Invalid member ID" }] })
  );
  assert.equal(result.accepted, false);
  assert.deepEqual(result.errors, ["Invalid member ID"]);
  const validation = await validateProfessionalClaim(payload, "k", async (url) => {
    assert.match(url, /\/validate$/);
    return jsonResponse(200, {});
  });
  assert.equal(validation.accepted, true);
  await assert.rejects(
    validateProfessionalClaim(payload, "k", async () => jsonResponse(401, { message: "Unauthorized" })),
    /HTTP 401\): Unauthorized/
  );
});

test("transmit route requires billing roles, both reviews, production mode, and never exposes the key", () => {
  const route = readFileSync(new URL("../app/api/ehr/billing/transmit/route.ts", import.meta.url), "utf8");
  assert.match(route, /canTransmit\(actor\.role\)/);
  assert.match(route, /claim\.status !== "ready_to_transmit"/);
  assert.match(route, /config\.mode !== "production"/);
  assert.doesNotMatch(route, /apiKey[^)]*NextResponse|NextResponse[^;]*apiKey/);
  const amplify = readFileSync(new URL("../amplify.yml", import.meta.url), "utf8");
  assert.match(amplify, /EHR_CLEARINGHOUSE_SECRET_ARN/);
  assert.doesNotMatch(amplify, /STEDI/);
});
