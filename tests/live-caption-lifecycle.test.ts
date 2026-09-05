import test from 'node:test';
import assert from 'node:assert/strict';
import { stopLiveCaptionCapture } from '../lib/ehr/live-caption-lifecycle.ts';
function fixture(stopError?: string, closeError = false) {
  const events: string[] = [];
  return { events, operations: {
    stop: async () => { events.push('stop'); if (stopError) throw Object.assign(new Error('test'), {name: stopError}); },
    closeRoom: async () => { events.push('close'); if (closeError) throw new Error('close failed'); },
    markStopped: async () => { events.push('marked stopped'); },
    markRoomClosed: async () => { events.push('marked closed'); },
  }};
}
test('successful caption stop keeps the meeting open', async () => {
  const f = fixture(); assert.equal(await stopLiveCaptionCapture(f.operations), false);
  assert.deepEqual(f.events, ['stop', 'marked stopped']);
});
test('uncertain stop closes the meeting before recording stopped state', async () => {
  const f = fixture('TimeoutError'); assert.equal(await stopLiveCaptionCapture(f.operations), true);
  assert.deepEqual(f.events, ['stop', 'close', 'marked closed']);
});
test('failed close never claims captions have stopped', async () => {
  const f = fixture('AccessDeniedException', true);
  await assert.rejects(stopLiveCaptionCapture(f.operations), /close failed/);
  assert.deepEqual(f.events, ['stop', 'close']);
});
test('already ended AWS meeting requires no further deletion', async () => {
  const f = fixture('NotFoundException'); assert.equal(await stopLiveCaptionCapture(f.operations), false);
  assert.deepEqual(f.events, ['stop', 'marked stopped']);
});
