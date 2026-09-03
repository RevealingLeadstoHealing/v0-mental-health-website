'use client';
import { useRef, useState } from 'react';
import { updateLiveCaptions, type CaptionLine } from '../../lib/ehr/live-captions';
import { telehealthRequest } from '../../lib/ehr/telehealth-request';

export function useMicrophoneCaptions() {
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [notice, setNotice] = useState('Live English captions will appear here while recording.');
  const cleanup = useRef<null | (() => Promise<void>)>(null);
  const generation = useRef(0);
  async function stop() {
    generation.current++;
    const close = cleanup.current; cleanup.current = null;
    if (close) await close();
  }
  async function start(stream: MediaStream, clientId: string) {
    await stop();
    const version = generation.current;
    setCaptions([]); setNotice('Connecting AWS live English captions…');
    let meeting: any; let devices: any; let credentials: any; let watchdog: ReturnType<typeof setInterval> | undefined;
    let captionStream: MediaStream | undefined;
    let closing: Promise<void> | undefined;
    const request = (body: object) => telehealthRequest('/api/ehr/scribe/captions', { method: 'POST', signal: AbortSignal.timeout(25000), headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId, ...body }) });
    const close = async () => {
      if (closing) return closing;
      closing = (async () => {
      clearInterval(watchdog);
      // Disconnect audio before attempting server cleanup, even if the request fails.
      meeting?.audioVideo.stop();
      captionStream?.getTracks().forEach(track => track.stop());
      try { await devices?.destroy(); } catch { /* Audio tracks already stopped. */ }
      if (credentials) {
        try { await request({ action: 'stop', sessionId: credentials.sessionId }); }
        catch { setNotice('Microphone disconnected. AWS caption-session cleanup could not be confirmed.'); }
      }
      })();
      return closing;
    };
    try {
      credentials = await request({ action: 'start', telehealthConsent: true, recordingConsent: true });
      if (version !== generation.current) { await close(); return; }
      const sdk = await import('amazon-chime-sdk-js');
      if (version !== generation.current) { await close(); return; }
      const logger = new sdk.NoOpLogger();
      devices = new sdk.DefaultDeviceController(logger);
      meeting = new sdk.DefaultMeetingSession(new sdk.MeetingSessionConfiguration(credentials.meeting, credentials.attendee), logger, devices);
      let lastWords = Date.now();
      meeting.audioVideo.transcriptionController?.subscribeToTranscriptEvent((event: any) => {
        if (version !== generation.current) return;
        if ('results' in event) {
          lastWords = Date.now();
          setCaptions(current => updateLiveCaptions(current, event.results, credentials.attendee.AttendeeId));
          setNotice('Receiving live English captions.');
        } else if (event.type === 'failed' || event.type === 'interrupted') setNotice('AWS live captions interrupted. The audio recording is separate; check the completed transcript after stopping.');
      });
      cleanup.current = close;
      // Caption cleanup must never stop the separate audio recorder's tracks.
      captionStream = stream.clone();
      await meeting.audioVideo.startAudioInput(captionStream);
      if (version !== generation.current) { await close(); return; }
      meeting.audioVideo.start();
      setNotice('Connected to AWS captions. Waiting for spoken words…');
      watchdog = setInterval(() => {
        if (Date.now() - lastWords > 15000) setNotice('No caption words received for 15 seconds. If you are speaking, check the microphone. Live transcription is not verified by the recording timer.');
      }, 5000);
    } catch (error: any) {
      await close(); cleanup.current = null;
      if (version === generation.current) setNotice(`Live captions unavailable: ${error.message}. Recording can still be processed after stopping.`);
    }
  }
  return { captions, notice, start, stop, reset: () => { setCaptions([]); setNotice('Live English captions will appear here while recording.'); } };
}
