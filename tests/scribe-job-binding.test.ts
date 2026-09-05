import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveScribeJobBinding } from '../lib/ehr/scribe-job-binding.ts';

const record = { practiceId: 'p', clientId: 'c', recordType: 'healthscribe-job', recordId: 'job-1', payload: { jobName: 'job-1', mediaKey: 'temporary-audio/p/c/audio.webm' } };
test('saved job determines the source audio for cleanup', () => {
  assert.deepEqual(resolveScribeJobBinding(record, 'p', 'c', 'job-1'), { jobName: 'job-1', mediaKey: record.payload.mediaKey });
});
test('legacy random record IDs still require an exact saved job binding', () => {
  assert.ok(resolveScribeJobBinding({ ...record, recordId: 'record_legacy' }, 'p', 'c', 'job-1'));
  assert.equal(resolveScribeJobBinding({ ...record, payload: { ...record.payload, jobName: 'job-other' } }, 'p', 'c', 'job-1'), null);
});
test('another chart, practice, job or audio path cannot claim the result', () => {
  assert.equal(resolveScribeJobBinding(record, 'other', 'c', 'job-1'), null);
  assert.equal(resolveScribeJobBinding(record, 'p', 'other', 'job-1'), null);
  assert.equal(resolveScribeJobBinding(record, 'p', 'c', 'job-2'), null);
  assert.equal(resolveScribeJobBinding({ ...record, payload: { ...record.payload, mediaKey: 'temporary-audio/p/other/audio.webm' } }, 'p', 'c', 'job-1'), null);
  assert.equal(resolveScribeJobBinding(null, 'p', 'c', 'job-1'), null);
});
