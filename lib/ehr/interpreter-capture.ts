// Decide how Chime streaming transcription should capture speech for a consented
// two-party interpreter session. English is always one option; the other party's
// language (chosen in the UI, as a base code like `es`) is mapped to a single Chime
// streaming dialect so both sides are recognized via language identification.
// If the chosen language has no supported streaming dialect (or is English), we fall
// back to English-only capture — exactly today's behavior — rather than send an
// invalid configuration.

// Documented Chime/Transcribe streaming dialects we offer, one per base language.
// Keep to a single dialect per language so LanguageOptions stays valid.
const STREAMING_DIALECT: Record<string, string> = {
  en: 'en-US',
  es: 'es-US',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  th: 'th-TH',
  hi: 'hi-IN',
};

export type CaptureLanguageOptions =
  | { identify: false }
  | { identify: true; languageOptions: string; preferred: string };

// `otherLanguage` is the other party's language as selected in the UI (e.g. `es`,
// `es-US`, `fr`). We key off the base code; English or an unmapped language keeps
// English-only capture.
export function captureLanguageOptions(otherLanguage: string): CaptureLanguageOptions {
  const base = (otherLanguage || '').split('-')[0].toLowerCase();
  const dialect = STREAMING_DIALECT[base];
  if (!base || base === 'en' || !dialect || dialect === 'en-US') return { identify: false };
  return { identify: true, languageOptions: `en-US,${dialect}`, preferred: 'en-US' };
}
