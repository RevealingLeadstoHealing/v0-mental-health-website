// On-site intake session flow — regression guard.
//
// This test protects the fixes made after the first real on-site patient
// session, where the deployed EHR lost consents and could not complete the
// visit. It is a STATIC contract test: it reads the source and asserts the
// corrected structures are present. It does not run a server, touch AWS, or
// use any patient data — so it is safe to run any time and can be run before a
// deploy to confirm these specific protections are still in the build.
//
// Run with:  node --test   (or your existing test runner over the tests/ dir)

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/ehr/full-production-interface.tsx", import.meta.url), "utf8");

// ---------------------------------------------------------------------------
// FIX 1 — A failed insurance / photo-ID IMAGE upload must NOT throw and abort
// patient creation before the consent forms are saved. This was the root cause
// of "the patient's consents weren't there." Each upload is wrapped so a
// failure records a pending marker and continues.
// ---------------------------------------------------------------------------
test("insurance/photo image upload failure cannot block consent creation (patient creation)", () => {
  // The upload loop tracks failures instead of throwing out of the whole flow.
  assert.match(source, /cardUploadFailures/);
  // A pending-upload marker document is recorded on failure.
  assert.match(source, /uploadPending:\s*true/);
  assert.match(source, /Image upload pending/i);
  // The consent packet (onboardingDocuments) is still persisted after the loop.
  assert.match(source, /persistModuleSnapshot\(client\.clientId,\s*"documents",\s*onboardingDocuments\)/);
});

// ---------------------------------------------------------------------------
// FIX 2 — The edit-client upload loop is also non-fatal, so re-uploading a card
// later cannot lose the rest of the saved record.
// ---------------------------------------------------------------------------
test("edit-client image upload failure is non-fatal", () => {
  assert.match(source, /editUploadFailures/);
  assert.match(source, /Some images did not upload and can be retried/i);
});

// ---------------------------------------------------------------------------
// FIX 3 — In-person, provider-witnessed patient signature. The patient signs on
// the provider's device during an on-site visit. It is honestly recorded as a
// witnessed in-person signature (NOT the patient logging in themselves).
// ---------------------------------------------------------------------------
test("in-person witnessed patient signature path exists and is honestly attributed", () => {
  assert.match(source, /witnessedInPersonClient/);
  assert.match(source, /In-person, witnessed on provider device/);
  assert.match(source, /witnessedBy/);
  // The role option is offered to the provider/owner.
  assert.match(source, /Patient signature — signed in person on this device/);
  // It is attributed to the patient (authenticatedRole "client"), not the provider.
  assert.match(source, /authenticatedRole:\s*"client"[\s\S]{0,200}signatureMethod/);
});

// ---------------------------------------------------------------------------
// FIX 4 — Documented verbal-consent path (provider attestation, not a forged
// patient signature), for on-site consent when a signature cannot be captured.
// ---------------------------------------------------------------------------
test("documented verbal-consent path exists and is a provider attestation", () => {
  assert.match(source, /recordVerbalConsent/);
  assert.match(source, /Verbal consent obtained — provider attested/);
  assert.match(source, /method:\s*"Verbal"/);
  assert.match(source, /obtainedBy/);
});

// ---------------------------------------------------------------------------
// FIX 5 — Signature panel auto-advances to the next unsigned form so multiple
// consents can be signed in a row without the page jumping to the bottom.
// ---------------------------------------------------------------------------
test("signature panel auto-advances to the next unsigned document", () => {
  assert.match(source, /stillNeedsSignature/);
  assert.match(source, /justSignedAuthRole/);
});

// ---------------------------------------------------------------------------
// SAVE PATH INTEGRITY — the machinery that persists clinical work must remain
// intact: the records API call, the queued save with timeout + failure
// surfacing, and the biopsychosocial submit writing an "intake" snapshot.
// If any of these disappear, saves could silently fail — this catches that.
// ---------------------------------------------------------------------------
test("clinical save path to the records API remains intact", () => {
  // Central persist call to the records endpoint.
  assert.match(source, /productionApi\("\/api\/ehr\/records"/);
  // Save queue surfaces failures instead of hanging silently.
  assert.match(source, /AWS save failed:/);
  assert.match(source, /The save timed out/);
  // Biopsychosocial submit persists the intake module and marks it submitted.
  assert.match(source, /moduleKey:\s*"intake"/);
  assert.match(source, /status:\s*"submitted"/);
});

// ---------------------------------------------------------------------------
// STRUCTURED PICKERS — the biopsychosocial, treatment plan, and MSE forms must
// keep their quick-select structured inputs wired in.
// ---------------------------------------------------------------------------
test("structured pickers are wired into intake and treatment plan", () => {
  assert.match(source, /import\s*\{\s*StructuredPicker,\s*intakePickerGroups,\s*treatmentPlanPickerGroups\s*\}/);
  assert.match(source, /groups=\{intakePickerGroups\.presentingProblem\}/);
  assert.match(source, /groups=\{treatmentPlanPickerGroups\.problem\}/);
});
