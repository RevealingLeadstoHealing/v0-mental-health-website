// Correlate each translation with the active room and a finalized caption.
// Never send incomplete captions to speech synthesis.
export type TranslationInput = { sessionId: string; captionId: string; text: string; sourceLanguage: string; targetLanguage: string };
export function translationInput(body: Record<string, unknown>): TranslationInput | null {
  const { sessionId, captionId, text, sourceLanguage, targetLanguage } = body;
  if (typeof sessionId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(sessionId)) return null;
  if (typeof captionId !== 'string' || !captionId.trim() || captionId.length > 200) return null;
  if (typeof text !== 'string' || !text.trim() || new TextEncoder().encode(text).length > 5000) return null;
  if (body.partial !== false) return null;
  const language = /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/;
  if (typeof sourceLanguage !== 'string' || !language.test(sourceLanguage) || sourceLanguage === 'auto') return null;
  if (typeof targetLanguage !== 'string' || !language.test(targetLanguage) || targetLanguage === 'auto') return null;
  return { sessionId, captionId, text: text.trim(), sourceLanguage, targetLanguage };
}
export function canTranslateCaption(room: any, member: any, input: TranslationInput, now = Math.floor(Date.now() / 1000)): boolean {
  return !!(room?.sessionId === input.sessionId && room.state === 'active' && room.expiresAt > now &&
    room.recording === true && room.clientRecordingConsent === true && room.captions === true &&
    member?.attendeeId && member.meetingId === room.meeting?.MeetingId);
}
