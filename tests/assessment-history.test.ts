import assert from "node:assert/strict";
import test from "node:test";
import { assessmentHistory, recordAssessment } from "../lib/ehr/assessment-history.ts";

test("retains the existing result and every subsequent completion in order", () => {
  const original = { completedAt: "2026-08-01", score: 12, responses: [3, 3, 3, 3] };
  const second = recordAssessment(original, { completedAt: "2026-09-01", score: 4 });
  const third = recordAssessment(second, { completedAt: "2026-09-02", score: 0 });
  assert.deepEqual(assessmentHistory(third).map(item => item.score), [12, 4, 0]);
  assert.equal(third.score, 0);
  assert.ok(assessmentHistory(third).every(item => !("history" in item)));
  assert.equal("history" in original, false);
  original.responses[0] = 0;
  assert.equal(second.history[0].responses[0], 3);
});

test("retains non-scored assessments, same-date completions, and full form data", () => {
  const first = recordAssessment(undefined, { completedAt: "2026-09-01", data: { emergencySteps: "First saved plan" } });
  const second = recordAssessment(first, { completedAt: "2026-09-01", data: { emergencySteps: "Updated plan" } });
  const loaded = JSON.parse(JSON.stringify(second));
  assert.deepEqual(assessmentHistory(loaded).map(item => item.data.emergencySteps), ["First saved plan", "Updated plan"]);
});

test("does not invent history for unfinished results", () => {
  assert.deepEqual(assessmentHistory({ score: 0 }), []);
  assert.deepEqual(assessmentHistory(undefined), []);
  assert.throws(() => recordAssessment(undefined, { score: 0 }), /completion date/);
});
