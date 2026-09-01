import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoicemailHandler } from '../infra/aws/business-phone/voicemail-flow.mjs';
const config = { accountId: '123456789012', region: 'us-east-1', applicationId: 'app', practiceId: 'practice', providerId: 'provider', number: '+12025550100', bucket: 'private-voicemail' };
function setup() {
  let saved;
  const handler = createVoicemailHandler(config, {
    async get() { return saved && structuredClone(saved); },
    async save(item, previous) {
      if (previous !== saved?.lastSequence) throw Object.assign(new Error('race'), { name: 'ConditionalCheckFailedException' });
      saved = structuredClone(item);
    },
  });
  const event = (Sequence, InvocationEventType, ActionData) => ({ SchemaVersion: '1.0', Sequence, InvocationEventType, ActionData,
    CallDetails: { AwsAccountId: config.accountId, AwsRegion: config.region, SipApplicationId: config.applicationId, TransactionId: 'transaction',
      Participants: [{ ParticipantTag: 'LEG-A', CallId: 'call', Direction: 'Inbound', To: config.number, From: '+12025550101' }] } });
  return { handler, event, saved: () => saved };
}
test('greeting precedes capture and completed callback binds the saved message to this call', async () => {
  const s = setup();
  assert.equal((await s.handler(s.event(1, 'NEW_INBOUND_CALL'))).Actions[0].Type, 'Speak');
  const record = (await s.handler(s.event(2, 'ACTION_SUCCESSFUL', { Type: 'Speak' }))).Actions[0];
  assert.equal(record.Type, 'RecordAudio');
  const destination = { Type: 'S3', BucketName: config.bucket, Key: record.Parameters.RecordingDestination.Prefix + 'audio.wav' };
  await s.handler(s.event(3, 'ACTION_SUCCESSFUL', { Type: 'RecordAudio', RecordingDestination: destination }));
  await s.handler(s.event(4, 'HANGUP'));
  assert.equal(s.saved().state, 'completed');
  assert.equal(s.saved().audioKey, destination.Key);
  assert.equal(s.saved().providerId, 'provider');
});
test('duplicate callbacks reuse their response and older callbacks cannot restart recording', async () => {
  const s = setup(); const initial = s.event(1, 'NEW_INBOUND_CALL');
  const first = await s.handler(initial);
  assert.deepEqual(await s.handler(initial), first);
  await s.handler(s.event(2, 'ACTION_SUCCESSFUL', { Type: 'Speak' }));
  assert.deepEqual((await s.handler(initial)).Actions, []);
  assert.equal(s.saved().state, 'recording');
});
test('another account, line or recording path is rejected', async () => {
  const s = setup(); const wrong = s.event(1, 'NEW_INBOUND_CALL'); wrong.CallDetails.AwsAccountId = 'other';
  await assert.rejects(s.handler(wrong));
  const wrongLine = s.event(1, 'NEW_INBOUND_CALL'); wrongLine.CallDetails.Participants[0].To = '+12025550102';
  await assert.rejects(s.handler(wrongLine));
  await s.handler(s.event(1, 'NEW_INBOUND_CALL'));
  await s.handler(s.event(2, 'ACTION_SUCCESSFUL', { Type: 'Speak' }));
  await assert.rejects(s.handler(s.event(3, 'ACTION_SUCCESSFUL', { Type: 'RecordAudio', RecordingDestination: { Type: 'S3', BucketName: config.bucket, Key: 'another/chart.wav' } })));
  assert.equal(s.saved().state, 'recording');
});
test('failed greeting never starts recording and disconnected callers are not reported as saved messages', async () => {
  const s = setup(); await s.handler(s.event(1, 'NEW_INBOUND_CALL'));
  assert.equal((await s.handler(s.event(2, 'ACTION_FAILED', { Type: 'Speak' }))).Actions[0].Type, 'Hangup');
  await s.handler(s.event(3, 'HANGUP'));
  assert.equal(s.saved().state, 'ended-without-confirmed-recording');
  assert.equal(s.saved().audioKey, undefined);
});
