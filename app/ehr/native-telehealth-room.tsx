'use client';
import React, { useEffect, useRef, useState } from 'react';
import { SESSION_CONFIRMATION_TEXT, SESSION_CONFIRMATION_VERSION } from '../../lib/ehr/telehealth-consent';
import type { DefaultMeetingSession, DefaultDeviceController, VideoTileState } from 'amazon-chime-sdk-js';
type Props = { externalRecording?: boolean; timerLabel?: string; clientId: string; provider: boolean; providerConsent?: boolean; recordingConsent?: boolean; onRecordingReady?: (blob: Blob) => Promise<void>; onRecordingChange?: (recording: boolean) => void; onConnectionChange?: (connected: boolean) => void };
export default function NativeTelehealthRoom({ clientId, provider, providerConsent = false, recordingConsent = false, onRecordingReady, onConnectionChange, onRecordingChange, externalRecording = false, timerLabel = "00:00:00" }: Props) {
  const [status, setStatus] = useState<any>(null);
  const [notice, setNotice] = useState('Checking in-EHR calling…');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState(true);
  const [muted, setMuted] = useState(false);
  const [consent, setConsent] = useState(false);
  function readSessionReminder() {
    if (!('speechSynthesis' in window)) { setNotice('Audio reminder is unavailable in this browser. Read the session confirmation below.'); return; }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(SESSION_CONFIRMATION_TEXT));
  }
  const [clientRecordingConsent, setClientRecordingConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [retryAudio, setRetryAudio] = useState<Blob | null>(null);
  const [tiles, setTiles] = useState<VideoTileState[]>([]);
  const session = useRef<DefaultMeetingSession | null>(null);
  const controller = useRef<DefaultDeviceController | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const previewStream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const micGain = useRef<GainNode | null>(null);
  const live = useRef(true);
  const recordingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joined = useRef(false);
  const recordingStartedAt = useRef(0);
  async function api(action?: string, extra: any = {}) {
    const response = await fetch(action ? '/api/ehr/telehealth' : `/api/ehr/telehealth?clientId=${encodeURIComponent(clientId)}`, {
      method: action ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      ...(action ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, action, ...extra }) } : {}),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'The call request failed.');
    return body;
  }
  function stopPreview() { previewStream.current?.getTracks().forEach(track => track.stop()); previewStream.current = null; if (preview.current) preview.current.srcObject = null; }
  function stopRecording() {
    if (recordingTimeout.current) clearTimeout(recordingTimeout.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }
  function disconnectLocal() {
    stopRecording(); stopPreview();
    const current = session.current; session.current = null;
    current?.audioVideo.stop();
    current?.audioVideo.unbindAudioElement();
    localStream.current?.getTracks().forEach(track => track.stop()); localStream.current = null;
    void controller.current?.destroy(); controller.current = null; session.current = null;
    joined.current = false; onConnectionChange?.(false);
    if (live.current) { setConnected(false); setTiles([]); setMuted(false); setConsent(false); setClientRecordingConsent(false); }
  }
  useEffect(() => {
    live.current = true;
    let cancelled = false;
    const check = async () => {
      const requestedAt = Date.now();
      try {
        const next = await api(); if (cancelled) return;
        setStatus(next);
        if (!next.configured) setNotice('In-EHR calling is not activated yet. AWS setup and a test call are required.');
        else if (!joined.current) setNotice(next.active ? 'The room is open. Join when ready.' : 'Waiting for the provider to open a room.');
        if (joined.current && !next.active) { disconnectLocal(); setNotice('The session has ended.'); }
        if (recorder.current?.state === 'recording' && requestedAt >= recordingStartedAt.current && (!next.recording || !next.clientRecordingConsent)) stopRecording();
      } catch (e: any) { if (!cancelled) { stopRecording(); setNotice(e.message); } }
    };
    void check(); const timer = setInterval(check, 5000);
    const warn = (event: BeforeUnloadEvent) => { if (joined.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => { cancelled = true; live.current = false; clearInterval(timer); window.removeEventListener('beforeunload', warn); if (joined.current) void api('leave').catch(() => {}); disconnectLocal(); };
  }, [clientId]);
  useEffect(() => { if (provider && !recordingConsent) stopRecording(); }, [recordingConsent, provider]);
  async function cameraPreview() {
    setBusy(true);
    try { stopPreview(); const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); previewStream.current = stream; if (preview.current) preview.current.srcObject = stream; setNotice('Local camera preview only. No one else can see this preview.'); }
    catch (e: any) { setNotice(`Camera preview unavailable: ${e.message}`); }
    finally { setBusy(false); }
  }
  async function join() {
    setBusy(true); onConnectionChange?.(true); setNotice('Connecting…');
    try {
      stopPreview();
      if (provider && !status?.active) await api('start', { telehealthConsent: providerConsent });
      const credentials = await api('join', { telehealthConsent: provider ? providerConsent : consent, recordingConsent: clientRecordingConsent, confirmationVersion: SESSION_CONFIRMATION_VERSION });
      if (!live.current) { await api('leave').catch(() => {}); throw new Error('Call cancelled.'); }
      joined.current = true;
      const sdk = await import('amazon-chime-sdk-js');
      const logger = new sdk.NoOpLogger();
      const devices = new sdk.DefaultDeviceController(logger); controller.current = devices;
      const meeting = new sdk.DefaultMeetingSession(new sdk.MeetingSessionConfiguration(credentials.meeting, credentials.attendee), logger, devices); session.current = meeting;
      meeting.audioVideo.addObserver({
        audioVideoDidStart: () => { if (live.current) { setConnected(true); onConnectionChange?.(true); setNotice('Connected to the EHR room.'); } },
        audioVideoDidStop: () => { if (session.current !== meeting) return; stopRecording(); localStream.current?.getTracks().forEach(track => track.stop()); localStream.current = null; session.current = null; controller.current = null; void devices.destroy(); joined.current = false; onConnectionChange?.(false); if (live.current) { setConnected(false); setNotice('Call disconnected. You can join again.'); } },
        videoTileDidUpdate: tile => { if (!tile.tileId || !tile.boundAttendeeId || tile.isContent || !live.current) return; setTiles(current => [...current.filter(item => item.tileId !== tile.tileId), tile.clone()]); },
        videoTileWasRemoved: tileId => { if (live.current) setTiles(current => current.filter(item => item.tileId !== tileId)); },
      });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false }); localStream.current = stream;
      if (!live.current) { stream.getTracks().forEach(track => track.stop()); throw new Error('Call cancelled.'); }
      await meeting.audioVideo.startAudioInput(stream);
      if (audio.current) await meeting.audioVideo.bindAudioElement(audio.current);
      if (video) {
        try { const cameras = await meeting.audioVideo.listVideoInputDevices(); if (!cameras[0]) throw new Error('No camera found'); await meeting.audioVideo.startVideoInput(cameras[0].deviceId); meeting.audioVideo.startLocalVideoTile(); }
        catch { setVideo(false); setNotice('Camera unavailable; joining with audio.'); }
      }
      meeting.audioVideo.realtimeSubscribeToReceiveDataMessage('rlth-consent', message => { if (message.text() === 'withdrawn') stopRecording(); });
      meeting.audioVideo.realtimeSubscribeToAttendeeIdPresence((id, present) => { if (id !== credentials.attendee.AttendeeId && !present) stopRecording(); });
      if (!live.current) throw new Error('Call cancelled.');
      meeting.audioVideo.start();
    } catch (e: any) { if (joined.current) void api('leave').catch(() => {}); disconnectLocal(); setNotice(e.message || 'Unable to join. Check camera and microphone permissions.'); }
    finally { setBusy(false); }
  }
  async function leave(end = false) {
    setBusy(true); stopRecording();
    try { await api(end ? 'end' : 'leave'); disconnectLocal(); setNotice(end ? 'Session ended for everyone.' : 'You left the session.'); }
    catch (e: any) { disconnectLocal(); setNotice(`Disconnected locally. ${e.message}`); }
    finally { setBusy(false); }
  }
  async function toggleCamera() {
    try {
      if (video) { session.current?.audioVideo.stopLocalVideoTile(); await session.current?.audioVideo.stopVideoInput(); setVideo(false); }
      else { const devices = await session.current?.audioVideo.listVideoInputDevices(); if (!devices?.[0]) throw new Error('No camera is available.'); await session.current?.audioVideo.startVideoInput(devices[0].deviceId); session.current?.audioVideo.startLocalVideoTile(); setVideo(true); }
    } catch (e: any) { setNotice(e.message); }
  }
  async function upload(blob: Blob) {
    setUploading(true); setRetryAudio(blob);
    try { if (!onRecordingReady) throw new Error('AI upload is not connected.'); await onRecordingReady(blob); setRetryAudio(null); setNotice('Session audio uploaded for AI processing. Review the draft before signing.'); }
    catch (e: any) { setNotice(`Audio upload failed: ${e.message}. Keep this page open and retry.`); }
    finally { setUploading(false); }
  }
  async function startRecording() {
    setBusy(true);
    let mix: AudioContext | null = null;
    try {
      const remote = audio.current?.srcObject;
      if (!(remote instanceof MediaStream) || !remote.getAudioTracks().length || !localStream.current) throw new Error('Both sides must be connected before recording.');
      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) throw new Error('Use a browser that supports Opus/WebM recording.');
      await api('recording', { active: true, recordingConsent });
      mix = new AudioContext(); await mix.resume(); const context = mix;
      const destination = context.createMediaStreamDestination();
      const gain = context.createGain(); gain.gain.value = muted ? 0 : 1; micGain.current = gain;
      context.createMediaStreamSource(localStream.current).connect(gain).connect(destination);
      context.createMediaStreamSource(remote).connect(destination);
      const capture = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 64000 });
      const chunks: Blob[] = []; let bytes = 0;
      recorder.current = capture;
      capture.ondataavailable = event => { if (event.data.size) { chunks.push(event.data); bytes += event.data.size; if (bytes > 40 * 1024 * 1024) stopRecording(); } };
      capture.onstop = () => { recorder.current = null; micGain.current = null; void context.close(); destination.stream.getTracks().forEach(track => track.stop()); if (live.current) setRecording(false); onRecordingChange?.(false); void api('recording', { active: false }).catch(() => {}); const blob = new Blob(chunks, { type: capture.mimeType }); if (blob.size) void upload(blob); };
      capture.onerror = () => { stopRecording(); setNotice('Recording encountered an error. Verify the saved audio before relying on the transcript.'); };
      capture.start(1000); recordingStartedAt.current = Date.now(); setRecording(true); onRecordingChange?.(true); setNotice('Recording both sides of this session for the AI scribe.');
      recordingTimeout.current = setTimeout(stopRecording, 90 * 60 * 1000);
    } catch (e: any) { if (mix) void mix.close(); void api('recording', { active: false }).catch(() => {}); setNotice(e.message); }
    finally { setBusy(false); }
  }
  const button = 'rounded-xl border px-4 py-2 disabled:opacity-50';
  return <section className="rounded-2xl border bg-white p-5 space-y-4 mb-4">
    <h2 className="text-xl font-semibold">In-EHR audio and video room</h2>
    <p role="status" className="text-sm">{notice}</p>
    <audio ref={audio} autoPlay />
    {provider && connected && <div className="space-y-2">
      <p role="timer" className="text-xl font-semibold">{timerLabel} · {recording ? "Recording" : "Not recording"}</p>
      <p className="text-sm">Recording requires your documented consent confirmation and the client’s recording consent. Stop recording to upload the audio for AI processing.</p>
      <button type="button" className={button} disabled={busy || uploading || (!recording && (!recordingConsent || !status?.clientRecordingConsent || Boolean(retryAudio)))} onClick={recording ? stopRecording : startRecording}>{recording ? 'Stop recording and process audio' : 'Record session audio for AI scribe'}</button>
    </div>}

    {status?.recording && <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">Session audio recording is active.</p>}
    {!connected && <>
      <video style={{ maxHeight: 180, objectFit: "contain" }} ref={preview} autoPlay muted playsInline className="max-h-56 rounded-xl bg-slate-900 w-full" aria-label="Local camera preview" />
      <div className="flex gap-2"><button type="button" className={button} disabled={busy} onClick={cameraPreview}>Preview my camera</button><button type="button" className={button} onClick={stopPreview}>Stop preview</button></div>
      <label className="block"><input type="checkbox" checked={video} onChange={e => setVideo(e.target.checked)} /> Join with camera on</label>
      {!provider && <div className="space-y-2"><p>Your intake agreement remains available in <a className="underline" href="/ehr/documents#signed-documents">Signed Documents</a>. Confirm participation for this session below.</p><button type="button" className={button} onClick={readSessionReminder}>Read session reminder aloud</button><label className="block"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> {SESSION_CONFIRMATION_TEXT}</label></div>}
      <button type="button" className={`${button} bg-blue-600 text-white`} disabled={externalRecording || busy || !status?.configured || (provider ? !providerConsent : !consent || !status?.active)} onClick={join}>{provider && !status?.active ? 'Open and join EHR room' : 'Join EHR room'}</button>
      {provider && !providerConsent && <p className="text-sm">Confirm telehealth consent in session setup to open the room.</p>}
    </>}
    <div className="grid md:grid-cols-2 gap-3">{tiles.map(tile => <div key={tile.tileId}><video autoPlay playsInline muted={tile.localTile} className="w-full rounded-xl bg-slate-900" aria-label={tile.localTile ? 'Your camera' : 'Other participant camera'} ref={element => { if (element && tile.tileId) session.current?.audioVideo.bindVideoElement(tile.tileId, element); }} /><p className="text-xs">{tile.localTile ? 'You' : 'Other participant'}</p></div>)}</div>
    {connected && <div className="flex flex-wrap gap-2">
      <button type="button" className={button} onClick={() => { const next = !muted; if (next) session.current?.audioVideo.realtimeMuteLocalAudio(); else session.current?.audioVideo.realtimeUnmuteLocalAudio(); if (micGain.current) micGain.current.gain.value = next ? 0 : 1; setMuted(next); }}>{muted ? 'Unmute microphone' : 'Mute microphone'}</button>
      <button type="button" className={button} onClick={toggleCamera}>{video ? 'Turn camera off' : 'Turn camera on'}</button>
      <button type="button" className={button} disabled={busy} onClick={() => leave()}>Leave room</button>
      {provider && <button type="button" className={button} disabled={busy} onClick={() => leave(true)}>End session for everyone</button>}
    </div>}
    {!provider && <label className="block text-sm"><input type="checkbox" checked={clientRecordingConsent} onChange={async event => { const value = event.target.checked; setClientRecordingConsent(value); if (!value) session.current?.audioVideo.realtimeSendDataMessage('rlth-consent', 'withdrawn', 5000); if (joined.current) { try { await api('consent', { recordingConsent: value }); } catch (e: any) { setNotice(e.message); setClientRecordingConsent(!value); } } }} /> I consent to audio recording and AI-assisted documentation. I can withdraw this consent.</label>}
    {uploading && <p role="status">Uploading session audio… Keep this page open.</p>}
    {retryAudio && !uploading && <button type="button" className={button} onClick={() => upload(retryAudio)}>Retry recording upload</button>}
    {provider && <p className="text-sm text-slate-600">Business-number calling and fax: not connected. These need a carrier account and assigned numbers before use.</p>}
  </section>;
}
