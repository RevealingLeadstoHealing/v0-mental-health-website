import test from 'node:test';
import assert from 'node:assert/strict';
import { createFaxIngestor } from '../infra/aws/fax/ingest.mjs';
const config = { bucket: 'private-fax', region: 'us-east-1', practiceId: 'practice', providerId: 'provider', kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test' };
const event = () => ({ Records: [{ eventSource: 'aws:s3', eventName: 'ObjectCreated:Put', awsRegion: 'us-east-1',
  s3: { bucket: { name: config.bucket }, object: { key: 'inbound-faxes/practice/fax.pdf', versionId: 'version-1' } } }] });
function setup() {
  const records = new Map();
  const sources = [];
  const metadata = { ContentType: 'application/pdf', ContentLength: 10, ServerSideEncryption: 'aws:kms', SSEKMSKeyId: config.kmsKeyArn, Metadata: { 'fax-id': 'delivery-1' }, LastModified: new Date('2026-09-01T12:00:00Z') };
  const io = {
    async head(source) { sources.push(source); return metadata; },
    async signature() { return '%PDF-'; },
    async insert(item) {
      if (records.has(item.id)) throw Object.assign(new Error('duplicate'), { name: 'ConditionalCheckFailedException' });
      records.set(item.id, item);
    },
  };
  return { records, sources, metadata, io, ingest: createFaxIngestor(config, io) };
}
test('received PDF remains unassigned and uses the exact delivered object version', async () => {
  const s = setup(); await s.ingest(event());
  const item = [...s.records.values()][0];
  assert.equal(item.status, 'UNASSIGNED'); assert.equal(item.clientId, undefined);
  assert.equal(item.providerId, 'provider'); assert.equal(item.storageVersion, 'version-1');
  assert.equal(s.sources[0].VersionId, 'version-1');
});
test('duplicate delivery never resets or overwrites the original inbox record', async () => {
  const s = setup(); await s.ingest(event());
  const original = [...s.records.values()][0]; original.status = 'ASSIGNED'; original.clientId = 'client';
  const retry = event(); retry.Records[0].s3.object.versionId = 'version-2';
  assert.equal((await s.ingest(retry)).results[0].status, 'already-received');
  assert.equal(s.records.size, 1); assert.equal(original.status, 'ASSIGNED'); assert.equal(original.storageVersion, 'version-1');
});
test('storage failure can be retried without a stuck placeholder', async () => {
  const s = setup(); const read = s.io.head; s.io.head = async () => { throw new Error('temporary failure'); };
  await assert.rejects(s.ingest(event())); assert.equal(s.records.size, 0);
  s.io.head = read; await s.ingest(event()); assert.equal(s.records.size, 1);
});
test('untrusted buckets, other practices and missing object versions are rejected before access', async () => {
  const s = setup();
  for (const mutate of [e => { e.Records[0].s3.bucket.name = 'client-uploads'; },
    e => { e.Records[0].s3.object.key = 'inbound-faxes/other/fax.pdf'; },
    e => { e.Records[0].s3.object.versionId = 'null'; }]) {
    const invalid = event(); mutate(invalid); await assert.rejects(s.ingest(invalid));
  }
  assert.equal(s.sources.length, 0);
});
test('invalid PDF, encryption or oversized file never becomes an inbox entry', async () => {
  const s = setup(); s.io.signature = async () => '<html'; await assert.rejects(s.ingest(event()));
  s.io.signature = async () => '%PDF-'; s.metadata.SSEKMSKeyId = 'other-key'; await assert.rejects(s.ingest(event()));
  s.metadata.SSEKMSKeyId = config.kmsKeyArn; s.metadata.ContentLength = 50 * 1024 * 1024; await assert.rejects(s.ingest(event()));
  assert.equal(s.records.size, 0);
});
