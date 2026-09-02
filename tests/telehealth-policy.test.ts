import test from 'node:test';
import assert from 'node:assert/strict';
import { telehealthKey, canManageTelehealth, canStartLiveCaptions, roomIsActive, safeRoomStatus } from '../lib/ehr/telehealth-policy.ts';
test('captions require an active room, recording, both consents and a clinical manager', () => {
  const room = { state: 'active', meeting: { MeetingId: 'test' }, expiresAt: Math.floor(Date.now() / 1000) + 60, recording: true, clientRecordingConsent: true };
  assert.equal(canStartLiveCaptions('provider', room, true), true);
  for (const role of ['client', 'billing_staff', 'auditor']) assert.equal(canStartLiveCaptions(role, room, true), false);
  assert.equal(canStartLiveCaptions('owner', room, false), false);
  for (const patch of [{recording: false}, {clientRecordingConsent: false}, {expiresAt: 0}, {state: 'starting'}]) assert.equal(canStartLiveCaptions('provider', {...room, ...patch}, true), false);
});
test('room state is isolated by practice and client and excluded from ordinary clinical record keys', () => {
  assert.notDeepEqual(telehealthKey('practice-a', 'client-1'), telehealthKey('practice-b', 'client-1'));
  assert.notDeepEqual(telehealthKey('practice-a', 'client-1'), telehealthKey('practice-a', 'client-2'));
  assert.equal(telehealthKey('p', 'c').SK.startsWith('RECORD#'), false);
  assert.throws(() => telehealthKey('p', 'c#other'));
});
test('clients and administrative roles cannot manage rooms', () => {
  for (const role of ['client', 'billing_staff', 'auditor', 'clinical_staff']) assert.equal(canManageTelehealth(role), false);
  assert.equal(canManageTelehealth('provider'), true);
  assert.equal(canManageTelehealth('owner'), true);
});
test('expired or incomplete rooms are never active; status never includes meeting credentials', () => {
  const room = { state: 'active', meeting: { MeetingId: 'private-meeting', JoinToken: 'do-not-expose' }, expiresAt: 200, recording: true, clientRecordingConsent: true };
  assert.equal(roomIsActive(room, 100000), true);
  assert.equal(roomIsActive(room, 200000), false);
  assert.equal(roomIsActive({ ...room, state: 'starting' }, 100000), false);
  assert.deepEqual(safeRoomStatus(room, 100000), { active: true, recording: true, clientRecordingConsent: true });
  assert.deepEqual(safeRoomStatus(room, 200000), { active: false, recording: false, clientRecordingConsent: false });
});
