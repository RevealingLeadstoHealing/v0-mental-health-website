'use client';
import React, { useEffect, useRef, useState } from 'react';
import type { CaptionLine } from '../../lib/ehr/live-captions';
import { telehealthRequest } from '../../lib/ehr/telehealth-request';

type Translation = { text: string; original: string; language: string };
// Display and audio preferences belong to this participant, never the other participant.
export default function InterpreterCaptions({ captions, clientId, sessionId, active }: {
  captions: CaptionLine[]; clientId: string; sessionId: string; active: boolean;
}) {
  const [languages, setLanguages] = useState<{ code: string; name: string }[]>([]);
  const [target, setTarget] = useState('en');
  const [enabled, setEnabled] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const [display, setDisplay] = useState('both');
  const [notice, setNotice] = useState('');
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const playback = useRef<HTMLAudioElement>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const pending = useRef(0);
  const seen = useRef(new Set<string>());
  const abort = useRef<AbortController | null>(null);
  const audioUrl = useRef<string | null>(null);
  const audioAfter = useRef(0);
  const request = (action: string, extra: object, signal?: AbortSignal) => telehealthRequest('/api/ehr/telehealth', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, action, ...extra }),
  });
  useEffect(() => {
    const controller = new AbortController();
    void request('interpreter-languages', {}, controller.signal).then(result => setLanguages(result.languages || []))
      .catch(() => { if (!controller.signal.aborted) setNotice('Language choices could not load. Rejoin the room to retry.'); });
    return () => controller.abort();
  }, [clientId, sessionId]);
  useEffect(() => {
    const controller = new AbortController(); abort.current = controller;
    generation.current++; seen.current.clear(); pending.current = 0; queue.current = Promise.resolve();
    audioAfter.current = Math.max(0, ...captions.map(line => line.start));
    setTranslations({}); setNotice('');
    return () => {
      controller.abort(); generation.current++;
      playback.current?.pause();
      if (audioUrl.current) { URL.revokeObjectURL(audioUrl.current); audioUrl.current = null; }
    };
  }, [clientId, sessionId, target, enabled, spoken, active]);
  useEffect(() => {
    if (!enabled || !active) return;
    const current = generation.current;
    const signal = abort.current?.signal;
    const visible = new Set(captions.map(line => `${line.id}:${line.text}`));
    seen.current = new Set([...seen.current].filter(key => visible.has(key)));
    for (const line of captions) {
      const key = `${line.id}:${line.text}`;
      if (line.partial || seen.current.has(key)) continue;
      seen.current.add(key);
      if (pending.current >= 10) { setNotice('Translation is behind the conversation. Some captions remain in their original language.'); continue; }
      pending.current++;
      queue.current = queue.current.then(async () => {
        if (current !== generation.current || signal?.aborted) return;
        // Current room startup is English. Preserve AWS language metadata when present.
        const locale = line.languageCode || 'en-US';
        const source = locale === 'zh-TW' ? 'zh-TW' : locale === 'pt-PT' ? 'pt-PT' : locale.split('-')[0];
        try {
          if (source === target) {
            setTranslations(previous => ({ ...previous, [line.id]: { text: line.text, original: line.text, language: target } }));
            return;
          }
          const result = await request('translate-caption', { sessionId, captionId: line.id, text: line.text, partial: false,
            sourceLanguage: source, targetLanguage: target, spoken: spoken && line.speaker === 'Other participant' && line.start > audioAfter.current }, signal);
          if (current !== generation.current || signal?.aborted || result.sessionId !== sessionId || result.captionId !== line.id) return;
          setTranslations(previous => {
            const next = { ...previous, [line.id]: { text: result.translatedText, original: line.text, language: target } };
            return Object.fromEntries(Object.entries(next).slice(-100));
          });
          setNotice(result.audioNotice || 'Machine translation active. Verify uncertain wording with the speaker.');
          if (result.audioBase64 && playback.current) {
            if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
            const bytes = Uint8Array.from(atob(result.audioBase64), char => char.charCodeAt(0));
            audioUrl.current = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
            const player = playback.current; player.src = audioUrl.current;
            await new Promise<void>(resolve => {
              const finish = () => { player.onended = null; player.onerror = null; signal?.removeEventListener('abort', finish); resolve(); };
              player.onended = finish; player.onerror = finish; signal?.addEventListener('abort', finish, { once: true });
              void player.play().catch(() => { if (!signal?.aborted) setNotice('Your browser paused spoken translation. Use the audio play control.'); finish(); });
            });
          }
        } catch {
          if (current === generation.current && !signal?.aborted) setNotice('Translation unavailable for this caption. Original words remain visible.');
        } finally { if (current === generation.current) pending.current--; }
      });
    }
  }, [captions, clientId, sessionId, target, enabled, spoken, active]);
  return <div className="space-y-2">
    <fieldset className="flex flex-wrap gap-3 text-sm">
      <legend className="font-medium">My caption and listening preferences</legend>
      <label><input type="checkbox" checked={enabled} disabled={!languages.length} onChange={e => setEnabled(e.target.checked)} /> Translate captions</label>
      <label>Translate into <select aria-label="My translation language" value={target} onChange={e => setTarget(e.target.value)}>{languages.map(language => <option key={language.code} value={language.code}>{language.name}</option>)}</select></label>
      <label>Show <select value={display} onChange={e => setDisplay(e.target.value)}><option value="both">Original and translation</option><option value="original">Original only</option><option value="translated">Translation only</option></select></label>
      <label><input type="checkbox" checked={spoken} onChange={e => setSpoken(e.target.checked)} /> Read the other participant’s translation aloud</label>
    </fieldset>
    <p className="text-xs">Use headphones for spoken translation. Language choices here control translated output; multilingual speech capture is still awaiting activation.</p>
    {!active && enabled && <p className="text-sm">Translation waits for an active, consented recording.</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <audio ref={playback} controls hidden={!spoken} aria-label="Translated speech playback" />
    <div role="log" aria-label="Conversation with translation" aria-live="polite" aria-relevant="additions text" className="max-h-64 overflow-y-auto text-sm space-y-2">
      {captions.map(line => {
        const translated = enabled && translations[line.id]?.original === line.text ? translations[line.id] : undefined;
        return <div key={line.id}><strong>{line.speaker}:</strong>
          {(display !== 'translated' || !translated) && <p lang={line.languageCode}>{line.text}{line.partial ? ' …' : ''}</p>}
          {translated && display !== 'original' && <p lang={translated.language} className="text-blue-800">{translated.text}</p>}
        </div>;
      })}
    </div>
  </div>;
}
