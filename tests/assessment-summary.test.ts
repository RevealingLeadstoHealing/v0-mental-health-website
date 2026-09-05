import assert from "node:assert/strict";
import test from "node:test";
import { completedAssessmentSummary, composeBiopsychosocialSummary } from "../lib/ehr/assessment-summary.ts";

test("includes every completed assessment, including non-scored and future instruments", () => {
  const source = Object.fromEntries(["phq9", "gad7", "suicideRisk", "substanceUse", "dast", "aces", "wecare", "violenceRisk", "safetyPlan", "customInstrument"].map(key => [key, { completedAt: "2026-09-01", score: 0, data: { notes: "Recorded finding" } }]));
  const summaries = completedAssessmentSummary(source);
  assert.equal(summaries.length, 10);
  assert.ok(summaries.every(item => item.text.includes("Score: 0") && item.text.includes("Recorded finding")));
  assert.equal(completedAssessmentSummary({ safetyPlan: { completedAt: "today", data: { emergencySteps: "Recorded plan" } } })[0].text.includes("Recorded plan"), true);
});
test("excludes empty or unfinished assessments and never invents a result", () => {
  assert.deepEqual(completedAssessmentSummary({ phq9: null, gad7: {}, unknown: { score: 0 } }), []);
  const [summary] = completedAssessmentSummary({ aces: { completedAt: "today", score: 0 } });
  assert.ok(!summary.text.includes("Severity") && !summary.text.includes("Diagnosis"));
});
test("combines narrative with results without mutation or duplicate accumulation", () => {
  const source = { gad7: { completedAt: "today", score: 4, responses: [1, 3] } };
  const snapshot = completedAssessmentSummary(source);
  const combined = composeBiopsychosocialSummary("Provider narrative", source);
  assert.ok(combined.startsWith("Provider narrative\n\nCompleted Assessments"));
  assert.equal(combined, composeBiopsychosocialSummary("Provider narrative", source));
  source.gad7.responses[0] = 9;
  assert.equal(snapshot[0].result.responses[0], 1);
  assert.equal(composeBiopsychosocialSummary("Narrative", {}), "Narrative");
});
