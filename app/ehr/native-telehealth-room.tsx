'use client';
import React, { useEffect, useRef, useState } from 'react';
import { telehealthRequest } from '../../lib/ehr/telehealth-request';
import { SESSION_CONFIRMATION_TEXT, SESSION_CONFIRMATION_VERSION } from '../../lib/ehr/telehealth-consent';
import type { DefaultMeetingSession, DefaultDeviceController, VideoTileState } from 'amazon-chime-sdk-js';
import type { TranscriptEvent } from 'amazon-chime-sdk-js';
import LiveCaptionPanel from './live-caption-panel';
import { updateLiveCaptions, type CaptionLine } from '../../lib/ehr/live-captions';
function cameraProblem(e: any) {
  const name = e?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera permission is blocked. Click the camera icon in the browser address bar, allow the camera for this site, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || e?.message === 'No camera found') return 'No camera was found. Plug in or enable a camera, then try again.';
  if (name === 'NotReadableError') return 'The camera is in use by another app or tab. Close it there, then try again.';
  return `Camera unavailable: ${e?.message || 'unknown error'}`;
}
type Props = { externalRecording?: boolean; timerLabel?: string; clientId: string; provider: boolean; providerConsent?: boolean; recordingConsent?: boolean; onRecordingReady?: (blob: Blob) => Promise<void>; onRecordingChange?: (recording: boolean) => void; onConnectionChange?: (connected: boolean) => void; onUploadingChange?: (uploading: boolean) => void };
export default function NativeTelehealthRoom({ clientId, provider, providerConsent = false, recordingConsent = false, onRecordingReady, onConnectionChange, onRecordingChange, onUploadingChange, externalRecording = false, timerLabel = "00:00:00" }: Props) {
  const [status, setStatus] = useState<any>(null);
  const [notice, setNotice] = useState('Checking in-EHR calling…');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState(true);
  const [muted, setMuted] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [cameraNotice, setCameraNotice] = useState('');
  const [selfViewOn, setSelfViewOn] = useState(false);
  const startTileOnConnect = useRef(false);
  const selfView = useRef<HTMLVideoElement | null>(null);
  const selfViewStream = useRef<MediaStream | null>(null);
  // Callback ref: bind the self-view stream whenever the <video> mounts. During
  // join() the element is not yet in the DOM (it renders only once connected), so
  // a plain ref assignment inside startSelfView() would be dropped. Binding on
  // mount guarantees the stream attaches as soon as the element appears.
  const bindSelfView = (element: HTMLVideoElement | null) => {
    selfView.current = element;
    if (element && selfViewStream.current && element.srcObject !== selfViewStream.current) {
      element.srcObject = selfViewStream.current;
      void element.play().catch(() => {});
    }
  };
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
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [roomSessionId, setRoomSessionId] = useState('');
  const [captionsRunning, setCaptionsRunning] = useState(false);
  const [captionNotice, setCaptionNotice] = useState('Room captions require joining this room and starting session recording. Local microphone captions appear beside the microphone controls.');
  const lastCaptionAt = useRef(0);
  const unsubscribeCaptions = useRef<(() => void) | null>(null);
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
  useEffect(() => {
    if (!recording) return;
    lastCaptionAt.current = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - lastCaptionAt.current > 15000) setCaptionNotice('No live caption words received for 15 seconds. If someone is speaking, live transcription needs attention; the recording timer does not confirm captions.');
    }, 5000);
    return () => clearInterval(timer);
  }, [recording]);
  const recordingStartedAt = useRef(0);
  async function api(action?: string, extra: any = {}) {
    return telehealthRequest(action ? '/api/ehr/telehealth' : `/api/ehr/telehealth?clientId=${encodeURIComponent(clientId)}`, {
      method: action ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      ...(action ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, action, ...extra }) } : {}),
    });
  }
  function stopPreview() { previewStream.current?.getTracks().forEach(track => track.stop()); previewStream.current = null; if (preview.current) preview.current.srcObject = null; setPreviewing(false); }
  function stopSelfView() { selfViewStream.current?.getTracks().forEach(track => track.stop()); selfViewStream.current = null; if (selfView.current) selfView.current.srcObject = null; setSelfViewOn(false); }
  // Show the provider her own camera directly, the same proven way the preview box
  // works (getUserMedia -> <video>.srcObject). This does not depend on the Chime
  // local video tile pipeline, which has not displayed reliably live. Chime still
  // gets its own camera input so the other participant sees video.
  async function startSelfView(): Promise<MediaStream | null> {
    try {
      stopSelfView();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      selfViewStream.current = stream;
      setSelfViewOn(true);
      // If the element is already mounted (camera toggle while connected), bind now.
      // On the join path the element is not mounted yet; the callback ref
      // (bindSelfView) binds it when it appears.
      const element = selfView.current;
      if (element) { element.srcObject = stream; await element.play().catch(() => {}); }
      return stream;
    } catch (e: any) {
      stopSelfView();
      setCameraNotice(`Your self-view could not start. ${cameraProblem(e)}`);
      return null;
    }
  }
  function stopRecording() {
    if (recordingTimeout.current) clearTimeout(recordingTimeout.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }
  function disconnectLocal() {
    stopRecording(); stopPreview(); stopSelfView();
    unsubscribeCaptions.current?.(); unsubscribeCaptions.current = null;
    const current = session.current; session.current = null;
    current?.audioVideo.stop();
    current?.audioVideo.unbindAudioElement();
    localStream.current?.getTracks().forEach(track => track.stop()); localStream.current = null;
    void controller.current?.destroy(); controller.current = null; session.current = null;
    joined.current = false; onConnectionChange?.(false);
    if (live.current) { setConnected(false); setTiles([]); setCaptions([]); setCaptionNotice('Live English captions start with consented session recording.'); setMuted(false); setConsent(false); setClientRecordingConsent(false); }
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
  useEffect(() => { if (provider && !providerConsent) stopPreview(); }, [providerConsent, provider]);
  async function cameraPreview() {
    if (provider && !providerConsent) { setNotice('Confirm telehealth consent above before previewing the camera.'); return; }
    setBusy(true);
    try {
      stopPreview(); setCameraNotice('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); previewStream.current = stream;
      const element = preview.current;
      if (element) { element.srcObject = stream; await element.play().catch(() => {}); }
      setPreviewing(true); setNotice('Local camera preview only. No one else can see this preview.');
    }
    catch (e: any) { const message = cameraProblem(e); setCameraNotice(message); setNotice(message); }
    finally { setBusy(false); }
  }
  async function join() {
    setBusy(true); onConnectionChange?.(true); setNotice('Connecting…'); setCameraNotice(''); startTileOnConnect.current = false;
    try {
      stopPreview();
      if (provider && !status?.active) await api('start', { telehealthConsent: providerConsent });
      const credentials = await api('join', { telehealthConsent: provider ? providerConsent : consent, recordingConsent: clientRecordingConsent, confirmationVersion: SESSION_CONFIRMATION_VERSION });
      if (!live.current) { await api('leave').catch(() => {}); throw new Error('Call cancelled.'); }
      joined.current = true;
      setCaptionsRunning(false);
      setRoomSessionId(credentials.sessionId || '');
      const sdk = await import('amazon-chime-sdk-js');
      const logger = new sdk.NoOpLogger();
      const devices = new sdk.DefaultDeviceController(logger); controller.current = devices;
      const meeting = new sdk.DefaultMeetingSession(new sdk.MeetingSessionConfiguration(credentials.meeting, credentials.attendee), logger, devices); session.current = meeting;
      const transcription = meeting.audioVideo.transcriptionController;
      const receiveCaption = (event: TranscriptEvent) => {
        if (!live.current || session.current !== meeting) return;
        if ('results' in event) {
          lastCaptionAt.current = Date.now();
          setCaptions(current => updateLiveCaptions(current, event.results, credentials.attendee.AttendeeId));
          setCaptionNotice('Receiving live English captions. Words may update as you speak.');
        } else {
          setCaptionsRunning(event.type === 'started' || event.type === 'resumed');
          const messages: Record<string, string> = { started: 'Live English captions are active.', resumed: 'Live English captions resumed.', interrupted: 'Live captions interrupted. Check the completed transcript after recording.', stopped: 'Live captions stopped. The completed recording will be processed for clinical review.', failed: 'AWS live captions failed. The completed recording can still be processed for clinical review.' };
          setCaptionNotice(messages[event.type] || 'Live caption status changed.');
        }
      };
      transcription?.subscribeToTranscriptEvent(receiveCaption);
      unsubscribeCaptions.current = () => transcription?.unsubscribeFromTranscriptEvent(receiveCaption);
      meeting.audioVideo.addObserver({
        audioVideoDidStart: () => { if (startTileOnConnect.current) { startTileOnConnect.current = false; try { meeting.audioVideo.startLocalVideoTile(); } catch (e: any) { setVideo(false); setCameraNotice(cameraProblem(e)); } } if (live.current) { setConnected(true); onConnectionChange?.(true); setNotice('Connected to the EHR room.'); } },
        audioVideoDidStop: () => { if (session.current !== meeting) return; unsubscribeCaptions.current?.(); unsubscribeCaptions.current = null; stopRecording(); stopSelfView(); localStream.current?.getTracks().forEach(track => track.stop()); localStream.current = null; session.current = null; controller.current = null; void devices.destroy(); joined.current = false; onConnectionChange?.(false); if (live.current) { setConnected(false); setCaptions([]); setCaptionNotice('Disconnected. Live captions are unavailable.'); setNotice('Call disconnected. You can join again.'); } },
        videoTileDidUpdate: tile => { if (!tile.tileId || !tile.boundAttendeeId || tile.isContent || !live.current) return; setTiles(current => [...current.filter(item => item.tileId !== tile.tileId), tile.clone()]); },
        videoTileWasRemoved: tileId => { if (live.current) setTiles(current => current.filter(item => item.tileId !== tileId)); },
      });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false }); localStream.current = stream;
      if (!live.current) { stream.getTracks().forEach(track => track.stop()); throw new Error('Call cancelled.'); }
      await meeting.audioVideo.startAudioInput(stream);
      if (audio.current) await meeting.audioVideo.bindAudioElement(audio.current);
      if (video) {
        // Show the provider her own camera right away using the proven preview
        // method, so joining always turns the camera on and shows self-video with
        // no separate Preview step. Done before the Chime input so a self-view
        // appears even if the Chime tile pipeline is slow.
        const selfStream = await startSelfView();
        try {
          if (!selfStream) throw new Error('No camera found');
          // Share the self-view camera with Chime instead of opening the camera a
          // second time. On devices that allow only one open handle per camera, a
          // second getUserMedia/startVideoInput(deviceId) throws NotReadableError;
          // passing the existing MediaStream (a clone, so stopping the self-view
          // later does not kill Chime's track) avoids that contention.
          const videoTrack = selfStream.getVideoTracks()[0]; if (!videoTrack) throw new Error('No camera found');
          const chimeStream = new MediaStream([videoTrack.clone()]);
          await meeting.audioVideo.startVideoInput(chimeStream); startTileOnConnect.current = true;
        }
        catch (e: any) { setCameraNotice(`The other participant will not see your video. ${cameraProblem(e)}`); }
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
      if (video) { stopSelfView(); session.current?.audioVideo.stopLocalVideoTile(); await session.current?.audioVideo.stopVideoInput(); setVideo(false); }
      else { setCameraNotice(''); const selfStream = await startSelfView(); if (!selfStream) throw new Error('No camera is available.'); const videoTrack = selfStream.getVideoTracks()[0]; if (!videoTrack) throw new Error('No camera is available.'); const chimeStream = new MediaStream([videoTrack.clone()]); await session.current?.audioVideo.startVideoInput(chimeStream); session.current?.audioVideo.startLocalVideoTile(); setVideo(true); }
    } catch (e: any) { const message = cameraProblem(e); setCameraNotice(message); setNotice(message); }
  }
  async function upload(blob: Blob) {
    setUploading(true); setRetryAudio(blob);
    try { if (!onRecordingReady) throw new Error('AI upload is not connected.'); await onRecordingReady(blob); setRetryAudio(null); setNotice('Session audio uploaded for AI processing. Review the draft before signing.'); }
    catch (e: any) { setNotice(`Audio upload failed: ${e.message}. Keep this page open and retry.`); }
    finally { setUploading(false); }
  }
  // Tell the page when session audio is still in flight (uploading) or held after a
  // failed upload (retryAudio), so the leave-Telehealth guard can warn before the
  // room unmounts and drops the recording. This window is after recording stops but
  // before HealthScribe has the audio, so it is not covered by recording/room/job state.
  useEffect(() => { onUploadingChange?.(uploading || retryAudio !== null); }, [uploading, retryAudio]);
  useEffect(() => () => { onUploadingChange?.(false); }, []);
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
      capture.onstop = () => { recorder.current = null; micGain.current = null; void context.close(); destination.stream.getTracks().forEach(track => track.stop()); if (live.current) setRecording(false); onRecordingChange?.(false); void api('recording', { active: false }).catch(error => { if (live.current) setCaptionNotice(`Caption stop could not be confirmed: ${error.message}. Use Stop live captions or end the room.`); }); const blob = new Blob(chunks, { type: capture.mimeType }); if (blob.size) void upload(blob); };
      capture.onerror = () => { stopRecording(); setNotice('Recording encountered an error. Verify the saved audio before relying on the transcript.'); };
      capture.start(1000); recordingStartedAt.current = Date.now(); setRecording(true); onRecordingChange?.(true); setNotice('Recording both sides of this session for the AI scribe.');
      recordingTimeout.current = setTimeout(stopRecording, 90 * 60 * 1000);
      setCaptions([]); setCaptionNotice('Requesting AWS live English captions…');
      try {
        await api('captions', { active: true, recordingConsent });
        // Recording could have stopped while the start request was in flight.
        if (recorder.current !== capture || capture.state !== 'recording') await api('captions', { active: false });
      } catch (error: any) {
        if (live.current) setCaptionNotice(error.message || 'Live captions are unavailable. Review the completed transcript after recording.');
      }
    } catch (e: any) { if (mix) void mix.close(); void api('recording', { active: false }).catch(() => {}); setNotice(e.message); }
    finally { setBusy(false); }
  }
  const button = 'rounded-xl border px-4 py-2 disabled:opacity-50';
  // Single source of truth for the Join button: the disabled flag and the reason
  // shown right next to it come from the same expression, so Join can never be a
  // silent no-op. The room is its own capture path and is intentionally NOT gated
  // on the standalone microphone scribe (externalRecording), so the top mic
  // recorder running or its transcription still processing does not disable Join.
  const joinDisabled = externalRecording || busy || !status?.configured || (provider ? !providerConsent : !consent || !status?.active);
  const joinDisabledReason = !joinDisabled ? ''
    : busy ? 'Working on the previous action. The button re-enables in a moment.'
    : !status?.configured ? 'In-EHR calling is not activated yet, so the room cannot be joined.'
    : provider && !providerConsent ? 'Confirm telehealth consent above before opening the room.'
    : !provider && !status?.active ? 'Waiting for the provider to open the room before you can join.'
    : !provider && !consent ? 'Confirm participation above before joining.'
    : externalRecording ? 'The EHR video room is temporarily unavailable. Try again in a moment.'
    : 'Join is unavailable right now.';
  return <section className="rounded-2xl border bg-white p-5 space-y-4 mb-4">
    <h2 className="text-xl font-semibold">In-EHR audio and video room</h2>
    <p role="status" className="text-sm">{notice}</p>
    <audio ref={audio} autoPlay />
    {cameraNotice && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{cameraNotice}</p>}
    <LiveCaptionPanel captions={captions} captionNotice={captionNotice} provider={provider} connected={connected} clientId={clientId} sessionId={roomSessionId} recordingActive={captionsRunning && (provider ? recording : status?.recording === true)} onStop={async () => { setCaptionsRunning(false); await api('captions', { active: false }); }} setCaptionNotice={setCaptionNotice} />
    {provider && connected && <div className="space-y-2">
      <p role="timer" className="text-xl font-semibold">{timerLabel} · {recording ? "Recording" : "Not recording"}</p>
      <p className="text-sm">Recording requires your documented consent confirmation and the client’s recording consent. Stop recording to upload the audio for AI processing.</p>
      <button type="button" className={button} disabled={busy || uploading || (!recording && (!recordingConsent || !status?.clientRecordingConsent || Boolean(retryAudio)))} onClick={recording ? stopRecording : startRecording}>{recording ? 'Stop recording and process audio' : 'Record session audio for AI scribe'}</button>
    </div>}

    {status?.recording && <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">Session audio recording is active.</p>}
    {!connected && <>
      <video style={{ maxHeight: 180, objectFit: "contain" }} ref={preview} autoPlay muted playsInline className="max-h-56 rounded-xl bg-slate-900 w-full" aria-label="Local camera preview" />
      {!previewing && <p className="text-sm">The preview box stays dark until you choose Preview my camera. Your camera is not on yet.</p>}
      <div className="flex gap-2"><button type="button" className={button} disabled={busy || (provider && !providerConsent)} onClick={cameraPreview}>Preview my camera</button><button type="button" className={button} onClick={stopPreview}>Stop preview</button></div>
      <label className="block"><input type="checkbox" checked={video} onChange={e => setVideo(e.target.checked)} /> Join with camera on</label>
      {!provider && <div className="space-y-2"><p>Your intake agreement remains available in <a className="underline" href="/ehr/documents#signed-documents">Signed Documents</a>. Confirm participation for this session below.</p><button type="button" className={button} onClick={readSessionReminder}>Read session reminder aloud</button><label className="block"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> {SESSION_CONFIRMATION_TEXT}</label></div>}
      <button type="button" className={`${button} bg-blue-600 text-white`} disabled={joinDisabled} onClick={join}>{provider && !status?.active ? 'Open and join EHR room' : 'Join EHR room'}</button>
      <p className="text-sm">Joining turns your camera on and shows your own video. No separate preview step is required. The separate microphone scribe does not affect this room.</p>
      {joinDisabled && joinDisabledReason && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{joinDisabledReason}</p>}
    </>}
    {connected && selfViewOn && <div><video ref={bindSelfView} autoPlay playsInline muted className="w-full max-h-56 rounded-xl bg-slate-900" style={{ objectFit: 'contain' }} aria-label="Your camera" /><p className="text-xs">You</p></div>}
    <div className="grid md:grid-cols-2 gap-3">{tiles.filter(tile => !tile.localTile).map(tile => <div key={tile.tileId}><video autoPlay playsInline className="w-full rounded-xl bg-slate-900" aria-label="Other participant camera" ref={element => { if (element && tile.tileId) session.current?.audioVideo.bindVideoElement(tile.tileId, element); }} /><p className="text-xs">Other participant</p></div>)}</div>
    {connected && <div className="flex flex-wrap gap-2">
      <button type="button" className={button} onClick={() => { const next = !muted; if (next) session.current?.audioVideo.realtimeMuteLocalAudio(); else session.current?.audioVideo.realtimeUnmuteLocalAudio(); if (micGain.current) micGain.current.gain.value = next ? 0 : 1; setMuted(next); }}>{muted ? 'Unmute microphone' : 'Mute microphone'}</button>
      <button type="button" className={button} onClick={toggleCamera}>{video ? 'Turn camera off' : 'Turn camera on'}</button>
      <button type="button" className={button} disabled={busy} onClick={() => leave()}>Leave room</button>
      {provider && <button type="button" className={button} disabled={busy} onClick={() => leave(true)}>End session for everyone</button>}
    </div>}
    {!provider && <label className="block text-sm"><input type="checkbox" checked={clientRecordingConsent} onChange={async event => { const value = event.target.checked; setClientRecordingConsent(value); if (!value) session.current?.audioVideo.realtimeSendDataMessage('rlth-consent', 'withdrawn', 5000); if (joined.current) { try { await api('consent', { recordingConsent: value }); } catch (e: any) { setNotice(e.message); setClientRecordingConsent(!value); } } }} /> I consent to audio recording and AI-assisted documentation. I can withdraw this consent.</label>}
    {uploading && <p role="status">Uploading session audio… Keep this page open.</p>}
    {retryAudio && !uploading && <button type="button" className={button} onClick={() => upload(retryAudio)}>Retry recording upload</button>}
  </section>;
}
