import test from 'node:test';
import assert from 'node:assert/strict';
import { newTreatmentGoals, newGoal, newObjective, summarizeTreatmentGoals } from '../lib/ehr/treatment-goals.ts';
test('multiple goals keep their objectives and dates in a serializable chart value', () => {
  const goals = newTreatmentGoals();
  goals[0].description = 'Long-term functional improvement'; goals[0].targetDate = '2026-12-01';
  goals[0].objectives[0].description = 'Track agreed weekly measure'; goals[0].objectives[0].targetDate = '2026-10-01';
  goals[0].objectives.push(newObjective()); goals.push(newGoal('short'));
  const saved = JSON.parse(JSON.stringify({ goals, ...summarizeTreatmentGoals(goals) }));
  assert.equal(saved.goals[0].objectives[0].targetDate, '2026-10-01');
  assert.equal(saved.goals[0].targetDate, '2026-12-01');
  assert.match(saved.longTermGoal, /functional improvement/);
  assert.equal(new Set(goals.map(goal => goal.id)).size, 3);
});
