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

test("supervision audit summaries carry no PHI fields", () => {
  const route = read("../app/api/ehr/supervision/route.ts");
  const summaries = [...route.matchAll(/summary: "([^"]*)"/g)].map((match) => match[1]);
  assert.ok(summaries.length >= 3);
  for (const summary of summaries) assert.doesNotMatch(summary, /\$\{/);
});
