import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("billing review and transmit overlay supervision before the clinical gate", () => {
  const billing = read("../app/api/ehr/billing/route.ts");
  const transmit = read("../app/api/ehr/billing/transmit/route.ts");
  for (const source of [billing, transmit]) {
    assert.match(source, /withSupervisionStatus/);
    assert.ok(source.indexOf("withSupervisionStatus(") < source.indexOf("validateClinicalReview(claim)"));
  }
});

test("the records route reconciles supervised notes", () => {
  const records = read("../app/api/ehr/records/route.ts");
  assert.match(records, /reconcileSupervisedNotes/);
  assert.match(records, /findIllegalFinalization/);
});

test("supervisee administration is owner-only and takes supervisor identity from the session", () => {
  const route = read("../app/api/ehr/supervision/supervisees/route.ts");
  assert.match(route, /requireRole\(actor, \["owner"\]\)/);
  assert.doesNotMatch(route, /body\??\.supervisorName/);
  assert.doesNotMatch(route, /body\??\.supervisorCredential/);
  assert.match(route, /superviseeTargetProblem/);
  assert.match(route, /actor\.name/);
});

test("submit, cosign and return enforce who may act", () => {
  const route = read("../app/api/ehr/supervision/route.ts");
  // The owner never submits for co-sign; only a registered supervisee may.
  assert.match(route, /actor\.role === "owner"[\s\S]{0,80}throw new ApiError\(403/);
  assert.match(route, /not set up as a supervisee/);
  // Cosign and return both pass through canSupervise before any change.
  const gate = route.indexOf("canSupervise(actor, existing)");
  assert.ok(gate > 0);
  assert.ok(gate < route.indexOf("transition(existing.status, \"cosign\")"));
  assert.ok(gate < route.indexOf("transition(existing.status, \"return\")"));
  assert.match(route, /body\.attested !== true/);
});

test("the records guard exempts the owner and blocks supervisee finalization", () => {
  const records = read("../app/api/ehr/records/route.ts");
  // Any registry entry (including a deactivated one) keeps the guard; the owner is exempt.
  assert.match(records, /actor\.role !== "owner" && supervisee \?/);
  assert.doesNotMatch(records, /supervisee\.active \? supervisee/);
  assert.match(records, /getStoredNotesSnapshot/);
  assert.match(records, /Supervisee notes are finalized only through supervisor review/);
});

test("supervision audit summaries carry no PHI fields", () => {
  const route = read("../app/api/ehr/supervision/route.ts");
  const summaries = [...route.matchAll(/summary: "([^"]*)"/g)].map((match) => match[1]);
  assert.ok(summaries.length >= 3);
  for (const summary of summaries) assert.doesNotMatch(summary, /\$\{/);
});
