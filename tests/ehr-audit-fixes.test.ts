import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const picker = read("app/ehr/structured-picker.tsx");
const scoredForm = read("app/ehr/scored-instrument-form.tsx");
const specialtyForm = read("app/ehr/specialty-assessment-form.tsx");
const blankSheet = read("app/ehr/blank-score-sheet.tsx");
const productionInterface = read("app/ehr/full-production-interface.tsx");
const clientsRoute = read("app/api/ehr/clients/route.ts");

test("resend-invitation passes a string email so the production build type-checks", () => {
  assert.match(clientsRoute, /email: String\(client\.email\), temporaryPassword: resendTemporaryPassword/);
});

test("quick-select chips match whole descriptors, not substrings (Weekly vs Twice weekly)", () => {
  const body = picker.slice(picker.indexOf("function phrasePresent"), picker.indexOf("function appendPhrase"));
  assert.doesNotMatch(body, /v\.includes\(p\)/);
});

test("reopening a saved scored screener shows the saved responses", () => {
  assert.match(scoredForm, /useState<Record<string, number>>\(\(\) => initialAnswers \|\| \{\}\)/);
  assert.match(specialtyForm, /initialAnswers=\{instrumentAnswers\}/);
});

test("scored screeners require responses and label incomplete totals", () => {
  assert.match(specialtyForm, /Object\.keys\(instrumentAnswers\)\.length/);
  assert.match(specialtyForm, /answeredAll \? band : `Incomplete/);
});

test("blank score sheet keeps unscored items blank and does not update the parent during render", () => {
  assert.doesNotMatch(blankSheet, /Number\(it\.score\) \|\| 0/);
  assert.doesNotMatch(blankSheet, /setItems\(\(prev\) =>[\s\S]*onChange\(/);
  assert.match(blankSheet, /initialItemScores/);
  assert.match(specialtyForm, /initialItemScores=/);
});

test("signature auto-advance skips the document that was just signed", () => {
  const start = productionInterface.indexOf("const stillNeedsSignature");
  assert.match(productionInterface.slice(start, start + 200), /doc\.id === targetDocId/);
});

test("verbal consent does not overwrite a patient-signed status", () => {
  const start = productionInterface.indexOf("const recordVerbalConsent");
  const body = productionInterface.slice(start, start + 2500);
  assert.match(body, /authenticatedRole === "client"\)\s*\?\s*doc\.status/);
});

test("billing claims send only a verified clearinghouse payer ID and a real provider signature", () => {
  const billing = productionInterface.slice(productionInterface.indexOf("function BillingPage"), productionInterface.indexOf("function TreatmentPlansPage"));
  assert.match(billing, /payerId: current\.payerIdVerificationStatus === "Verified" \? String\(current\.payerId \|\| ""\)\.trim\(\) : ""/);
  assert.match(billing, /providerSignature: String\(current\.providerSignature \|\| ""\)\.trim\(\)/);
  assert.match(billing, /label="Clearinghouse Payer ID"/);
  assert.doesNotMatch(billing, /value=\{intake\.providerSignature \|\| PRACTITIONER_NAME\}/);
});
