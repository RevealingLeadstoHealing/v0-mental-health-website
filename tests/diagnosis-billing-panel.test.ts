import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { claimDiagnoses, diagnosisPatch, mergeServiceCodes, otherDiagnoses, selectedDiagnoses, splitServiceCodes } from '../lib/ehr/diagnosis-billing.ts';

test('four ranked diagnoses map to claim ranks in order', () => {
  const record = { primaryDiagnosis: 'F10.20 | Alcohol dependence, uncomplicated', secondaryDiagnosis: '', tertiaryDiagnosis: 'F41.1 | Generalized anxiety disorder', fourthDiagnosis: 'F11.21 | Opioid dependence, in remission' };
  assert.deepEqual(selectedDiagnoses(record), [record.primaryDiagnosis, record.tertiaryDiagnosis, record.fourthDiagnosis]);
  assert.deepEqual(claimDiagnoses(record).map(d => [d.code, d.rank]), [['F10.20', 'primary'], ['F41.1', 'tertiary'], ['F11.21', 'quaternary']]);
});

test('changing a diagnosis keeps other diagnoses already on file', () => {
  const record = { primaryDiagnosis: 'F41.1 | GAD', diagnoses: ['F41.1 | GAD', 'Z63.0 | Partner problem'] };
  assert.deepEqual(otherDiagnoses(record), ['Z63.0 | Partner problem']);
  const patch = diagnosisPatch(record, 'primaryDiagnosis', 'F33.1 | MDD recurrent moderate');
  assert.equal(patch.primaryDiagnosis, 'F33.1 | MDD recurrent moderate');
  assert.deepEqual(patch.diagnoses, ['F33.1 | MDD recurrent moderate', 'Z63.0 | Partner problem']);
});

test('service and interpreter codes split from and merge back into the billing code list', () => {
  const codes = ['T1013 | HCPCS | Interpreter', '90791 | CPT | Intake', '96127 | CPT | Screening'];
  const split = splitServiceCodes(codes);
  assert.equal(split.serviceCode, '90791 | CPT | Intake');
  assert.equal(split.interpreterCode, 'T1013 | HCPCS | Interpreter');
  assert.deepEqual(split.otherCodes, ['96127 | CPT | Screening']);
  assert.deepEqual(mergeServiceCodes({ ...split, serviceCode: '90837 | CPT | Psychotherapy' }), ['90837 | CPT | Psychotherapy', '96127 | CPT | Screening', 'T1013 | HCPCS | Interpreter']);
  assert.deepEqual(mergeServiceCodes({ ...split, interpreterCode: '' }), ['90791 | CPT | Intake', '96127 | CPT | Screening']);
});

test('diagnosis and billing areas use the single consolidated panel', () => {
  const source = fs.readFileSync(new URL('../app/ehr/full-production-interface.tsx', import.meta.url), 'utf8');
  assert.equal((source.match(/<DiagnosisBillingPanel /g) || []).length, 5);
  assert.doesNotMatch(source, /Apply to tertiary diagnosis/);
  assert.doesNotMatch(source, /Type ICD code or diagnosis keyword/);
});
