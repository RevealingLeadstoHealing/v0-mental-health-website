import test from 'node:test';
import assert from 'node:assert/strict';
import { mseDomains, validateSpecialtyAssessment } from '../lib/ehr/specialty-assessments.ts';
import { recordAssessment, assessmentHistory } from '../lib/ehr/assessment-history.ts';
import { completedAssessmentSummary } from '../lib/ehr/assessment-summary.ts';
const base = { administrationDate: '2026-09-01', examiner: 'Test Provider', interpretation: 'Reviewed', followUp: 'Follow up scheduled' };
test('MSE cannot complete with unexamined fields silently normal', () => {
  assert.ok(validateSpecialtyAssessment('mse', base));
  assert.equal(validateSpecialtyAssessment('mse', { ...base, ...Object.fromEntries(mseDomains.map(domain => [domain, 'Not assessed: test'])) }), '');
});
test('official form entry requires provenance, version and respondent but accepts a recorded zero', () => {
  assert.ok(validateSpecialtyAssessment('psc', { ...base, results: '0' }));
  assert.equal(validateSpecialtyAssessment('psc', { ...base, results: '0', version: 'PSC-17', respondent: 'Parent', source: 'Chart document test' }), '');
});
test('new specialty completions retain history and appear in chart summaries', () => {
  const original = { label: 'Mental Status Exam (MSE)', completedAt: '2026-08-01', data: { interpretation: 'Earlier observation' } };
  const next = recordAssessment(original, { label: original.label, completedAt: '2026-09-01', data: { interpretation: 'Current observation' } });
  assert.equal(assessmentHistory(next).length, 2);
  assert.match(completedAssessmentSummary({ mse: next })[0].text, /Current observation/);
  assert.equal(original.data.interpretation, 'Earlier observation');
});
test('family clinical assessment cannot be completed using only an imported score', () => {
  assert.ok(validateSpecialtyAssessment('familyReview', { ...base, results: '0', version: 'test', respondent: 'test', source: 'test' }));
});
