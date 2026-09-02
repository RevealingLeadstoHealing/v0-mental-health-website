'use client';
import React, { useEffect, useRef } from 'react';
import type { CaptionLine } from '../../lib/ehr/live-captions';
export default function LiveCaptionPanel({ captions, captionNotice, provider, connected, onStop, setCaptionNotice }: { captions: CaptionLine[]; captionNotice: string; provider: boolean; connected: boolean; onStop: () => Promise<void>; setCaptionNotice: (notice: string) => void }) {
  const captionLog = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (captionLog.current) captionLog.current.scrollTop = captionLog.current.scrollHeight; }, [captions]);
  const button = 'rounded-lg border px-4 py-2 text-sm font-medium';
  return (
    <section aria-label="Live session captions" className="rounded-xl border p-3 space-y-2">
      <h3 className="font-semibold">Live session captions</h3>
      <p role="status" className="text-sm">{captionNotice}</p>
      <div ref={captionLog} role="log" aria-label="Live conversation" aria-live="polite" aria-relevant="additions text" className="max-h-64 overflow-y-auto text-sm space-y-1">
        {captions.map(line => <p key={line.id}><strong>{line.speaker}:</strong> {line.text}{line.partial ? ' …' : ''}</p>)}
      </div>
      <p className="text-xs">Captions show the conversation during recording. After stopping, review the completed transcript and clinical draft before merging into the chart.</p>
      {provider && connected && <button type="button" className={button} onClick={async () => {
        try { await onStop(); setCaptionNotice('Live captions stopped.'); }
        catch (error: any) { setCaptionNotice(`Caption stop could not be confirmed: ${error.message}. End the room if this continues.`); }
      }}>Stop live captions</button>}
    </section>
  );
}
