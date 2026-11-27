export function telehealthKey(practiceId: string, clientId: string) {
  if (!practiceId || !clientId || /[\r\n#]/.test(practiceId + clientId) || clientId.length > 200) throw new Error('Invalid client context.');
  return { PK: `PRACTICE#${practiceId}#CLIENT#${clientId}`, SK: 'TELEHEALTH#ACTIVE' };
}
export function canManageTelehealth(role: string) { return role === 'provider' || role === 'owner'; }
export function canStartLiveCaptions(role: string, room: any, providerConsent: unknown) {
  // Provider-attested consent: a solo provider who has confirmed recording consent on
  // their own screen can start captions on an active recording, with no separate
  // second client-device consent toggle. A client who is present and has withdrawn is
  // still blocked by the server-side teardown re-check, not here.
  return canManageTelehealth(role) && roomIsActive(room) && room.recording === true && providerConsent === true;
}
export function roomIsActive(room: any, now = Date.now()) {
  return Boolean(room?.meeting?.MeetingId && room?.state === 'active' && room?.expiresAt > Math.floor(now / 1000));
}
export function safeRoomStatus(room: any, now = Date.now()) {
  return { active: roomIsActive(room, now), recording: roomIsActive(room, now) && room.recording === true, clientRecordingConsent: roomIsActive(room, now) && room.clientRecordingConsent === true };
}
