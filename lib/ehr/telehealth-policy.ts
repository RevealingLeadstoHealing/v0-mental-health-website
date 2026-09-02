export function telehealthKey(practiceId: string, clientId: string) {
  if (!practiceId || !clientId || /[\r\n#]/.test(practiceId + clientId) || clientId.length > 200) throw new Error('Invalid client context.');
  return { PK: `PRACTICE#${practiceId}#CLIENT#${clientId}`, SK: 'TELEHEALTH#ACTIVE' };
}
export function canManageTelehealth(role: string) { return role === 'provider' || role === 'owner'; }
export function canStartLiveCaptions(role: string, room: any, providerConsent: unknown) {
  return canManageTelehealth(role) && roomIsActive(room) && room.recording === true && room.clientRecordingConsent === true && providerConsent === true;
}
export function roomIsActive(room: any, now = Date.now()) {
  return Boolean(room?.meeting?.MeetingId && room?.state === 'active' && room?.expiresAt > Math.floor(now / 1000));
}
export function safeRoomStatus(room: any, now = Date.now()) {
  return { active: roomIsActive(room, now), recording: roomIsActive(room, now) && room.recording === true, clientRecordingConsent: roomIsActive(room, now) && room.clientRecordingConsent === true };
}
