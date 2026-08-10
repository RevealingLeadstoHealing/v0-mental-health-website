"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type SessionUser = { id: string; email: string; fullName: string; role: string; practiceId: string };
type ClientProfile = { clientId: string; fullName: string; preferredName?: string; dateOfBirth?: string; status: string };
type ClinicalRecord = { recordId: string; recordType: string; status: string; createdAt: string; payload: Record<string, unknown> };
type AuditEvent = { auditId: string; timestamp: string; actorName: string; action: string; category: string; clientId?: string };

async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { credentials: "include", cache: "no-store", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The EHR request could not be completed.");
  return data;
}

export default function ProductionEhrPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [tab, setTab] = useState<"clients" | "notes" | "telehealth" | "audit">("clients");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [clientForm, setClientForm] = useState({ fullName: "", preferredName: "", dateOfBirth: "", email: "", phone: "" });
  const [noteForm, setNoteForm] = useState({ noteType: "progress", serviceDate: "", content: "" });
  const [scribe, setScribe] = useState({ consent: false, transcript: "", template: "BEHAVIORAL_SOAP", draft: "" });
  const [recording, setRecording] = useState(false);
  const [scribeJob, setScribeJob] = useState({ jobName: "", mediaKey: "", status: "" });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunks = useRef<Blob[]>([]);

  const loadClients = useCallback(async () => {
    const data = await api("/api/ehr/clients");
    setClients(data.clients || []);
    setSelectedClientId((current) => current || data.clients?.[0]?.clientId || "");
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await api("/api/ehr/auth/session");
        if (!session.authenticated) {
          window.location.replace("/login");
          return;
        }
        if (!active) return;
        setUser(session.user);
        await loadClients();
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to open the EHR.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadClients]);

  useEffect(() => {
    if (!selectedClientId) { setRecords([]); return; }
    api(`/api/ehr/records?clientId=${encodeURIComponent(selectedClientId)}`)
      .then((data) => setRecords(data.records || []))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load chart."));
  }, [selectedClientId]);

  async function createClient() {
    setBusy(true); setError(""); setNotice("");
    try {
      await api("/api/ehr/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(clientForm),
      });
      setClientForm({ fullName: "", preferredName: "", dateOfBirth: "", email: "", phone: "" });
      await loadClients();
      setNotice("Client chart created and audited.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create chart."); }
    finally { setBusy(false); }
  }

  async function saveRecord(recordType: string, payload: Record<string, unknown>, status = "draft") {
    if (!selectedClientId) throw new Error("Select a client chart first.");
    const data = await api("/api/ehr/records", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId: selectedClientId, recordType, status, payload }),
    });
    setRecords((current) => [data.record, ...current]);
    return data.record;
  }

  async function saveClinicalNote() {
    setBusy(true); setError(""); setNotice("");
    try {
      await saveRecord("clinical-note", { ...noteForm, providerReviewRequired: true });
      setNoteForm({ noteType: "progress", serviceDate: "", content: "" });
      setNotice("Clinical note draft saved to the encrypted client chart.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save note."); }
    finally { setBusy(false); }
  }

  function generateScribeDraft() {
    setError(""); setNotice("");
    if (!scribe.consent) { setError("Document recording and AI-scribe consent before using a transcript."); return; }
    if (!scribe.transcript.trim()) { setError("A transcript is required."); return; }
    const draft = `PROVIDER REVIEW REQUIRED\nTemplate: ${scribe.template}\n\nTranscript-derived preliminary documentation:\n${scribe.transcript.trim()}\n\nProvider must verify accuracy, medical necessity, risk, diagnosis, interventions, response, plan, and signatures before finalization.`;
    setScribe((current) => ({ ...current, draft }));
    setNotice("Preliminary draft generated. It is not a signed clinical note.");
  }

  async function saveScribeDraft() {
    setBusy(true); setError(""); setNotice("");
    try {
      if (!scribe.draft) throw new Error("Generate and review a draft first.");
      await saveRecord("ai-scribe-draft", {
        template: scribe.template,
        content: scribe.draft,
        consentDocumented: scribe.consent,
        providerReviewRequired: true,
        source: scribeJob.jobName ? "aws-healthscribe" : "manual-transcript",
        healthScribeJobName: scribeJob.jobName || "",
      });
      setNotice("Scribe draft saved to the selected chart for provider review.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save scribe draft."); }
    finally { setBusy(false); }
  }

  async function uploadAudioAndStartScribe(audio: Blob) {
    if (!selectedClientId) throw new Error("Select a client chart first.");
    if (!scribe.consent) throw new Error("Document recording and AI-scribe consent first.");
    const contentType = audio.type.split(";")[0] || "audio/webm";
    const upload = await api("/api/ehr/scribe/upload", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId: selectedClientId, contentType, consentConfirmed: true }),
    });
    const response = await fetch(upload.uploadUrl, { method: "PUT", headers: upload.uploadHeaders, body: audio });
    if (!response.ok) throw new Error("Encrypted audio upload failed.");
    const job = await api("/api/ehr/scribe/jobs", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId: selectedClientId, mediaKey: upload.key, noteTemplate: scribe.template, consentConfirmed: true }),
    });
    setScribeJob({ jobName: job.jobName, mediaKey: upload.key, status: job.status });
    setNotice("AWS HealthScribe is preparing the preliminary clinical documentation.");
  }

  async function startRecording() {
    setError(""); setNotice("");
    try {
      if (!scribe.consent) throw new Error("Document recording and AI-scribe consent before starting audio capture.");
      if (!selectedClientId) throw new Error("Select a client chart first.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: preferred });
      recorderChunks.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) recorderChunks.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setBusy(true);
        try { await uploadAudioAndStartScribe(new Blob(recorderChunks.current, { type: preferred })); }
        catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to start transcription."); }
        finally { setBusy(false); }
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
      setNotice("Audio capture started. The recording remains in memory until you stop it, then it is encrypted and uploaded.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Microphone access failed."); }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function uploadAudioFile(file?: File) {
    if (!file) return;
    setBusy(true); setError(""); setNotice("");
    try { await uploadAudioAndStartScribe(file); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to upload audio."); }
    finally { setBusy(false); }
  }

  async function checkScribeJob() {
    if (!scribeJob.jobName) return;
    setBusy(true); setError("");
    try {
      const result = await api(`/api/ehr/scribe/jobs?clientId=${encodeURIComponent(selectedClientId)}&jobName=${encodeURIComponent(scribeJob.jobName)}&mediaKey=${encodeURIComponent(scribeJob.mediaKey)}`);
      setScribeJob((current) => ({ ...current, status: result.status }));
      if (result.status === "COMPLETED") {
        const draft = JSON.stringify(result.clinicalDocument, null, 2);
        setScribe((current) => ({ ...current, transcript: JSON.stringify(result.transcript, null, 2), draft }));
        setNotice("AWS HealthScribe completed. Temporary source audio was deleted. Review every statement before saving the draft.");
      } else if (result.status === "FAILED") setError(result.failureReason || "AWS HealthScribe job failed.");
      else setNotice(`AWS HealthScribe status: ${result.status}. Check again shortly.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to check transcription."); }
    finally { setBusy(false); }
  }

  async function loadAudit() {
    setBusy(true); setError("");
    try {
      const data = await api("/api/ehr/audit?limit=50");
      setAuditEvents(data.events || []);
      setTab("audit");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load audit log."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/ehr/auth/logout", { method: "POST", credentials: "include" });
    window.location.replace("/login");
  }

  if (loading) return <main className="prod-ehr center"><div className="panel"><h1>Opening secure EHR…</h1></div></main>;
  if (!user) return <main className="prod-ehr center"><div className="panel"><h1>Secure session required</h1><p>{error}</p><Link href="/login">Return to login</Link></div></main>;

  const selectedClient = clients.find((client) => client.clientId === selectedClientId);
  return (
    <main className="prod-ehr">
      <style jsx global>{`
        .prod-ehr,.prod-ehr *{box-sizing:border-box}.prod-ehr{min-height:100vh;background:#f7f3ea;color:#28251f;font-family:Montserrat,Arial,sans-serif;font-size:15px;line-height:1.5}.prod-ehr.center{display:grid;place-items:center;padding:2rem}.prod-ehr header{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:1rem 1.25rem;background:#292620;color:white}.prod-ehr h1,.prod-ehr h2,.prod-ehr h3{margin:0;color:inherit;text-transform:none;font-family:Montserrat,Arial,sans-serif}.prod-ehr h1{font-size:1.25rem}.prod-ehr button,.prod-ehr .link-button{min-height:2.5rem;padding:.55rem .85rem;border:1px solid #292620;border-radius:7px;background:#292620;color:white;font-weight:700;cursor:pointer;text-decoration:none}.prod-ehr button.secondary{background:white;color:#292620}.prod-ehr button:disabled{opacity:.55;cursor:wait}.prod-ehr .shell{display:grid;grid-template-columns:230px 1fr;min-height:calc(100vh - 72px)}.prod-ehr aside{padding:1rem;border-right:1px solid #d9cfbe;background:#fff}.prod-ehr aside button{display:block;width:100%;margin-bottom:.5rem;text-align:left}.prod-ehr aside button.active{background:#caa74b;color:#211d14}.prod-ehr .content{padding:1.25rem}.prod-ehr .panel{padding:1.1rem;border:1px solid #d9cfbe;border-radius:8px;background:#fff}.prod-ehr .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.prod-ehr label{display:block;margin:.75rem 0 .25rem;font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.prod-ehr input,.prod-ehr select,.prod-ehr textarea{width:100%;padding:.65rem;border:1px solid #bfb4a2;border-radius:7px;background:white;color:#28251f;font:inherit}.prod-ehr textarea{min-height:150px;resize:vertical}.prod-ehr .actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1rem}.prod-ehr .alert{margin-bottom:1rem;padding:.75rem;border:1px solid #dc2626;border-radius:7px;background:#fef2f2;color:#991b1b}.prod-ehr .notice{margin-bottom:1rem;padding:.75rem;border:1px solid #15803d;border-radius:7px;background:#f0fdf4;color:#166534}.prod-ehr .client-row,.prod-ehr .record{width:100%;margin-top:.65rem;padding:.8rem;border:1px solid #d9cfbe;border-radius:7px;background:#faf8f3;text-align:left;color:#28251f}.prod-ehr .client-row.selected{border:2px solid #9a7728;background:#fff8dd}.prod-ehr .muted{color:#6f665a;font-size:.86rem}.prod-ehr pre{white-space:pre-wrap;overflow-wrap:anywhere}.prod-ehr .security{margin-top:1rem;padding:.8rem;border-left:4px solid #9a7728;background:#fff8dd}@media(max-width:800px){.prod-ehr .shell{grid-template-columns:1fr}.prod-ehr aside{display:flex;gap:.4rem;overflow:auto;border-right:0;border-bottom:1px solid #d9cfbe}.prod-ehr aside button{min-width:max-content;margin:0}.prod-ehr .grid{grid-template-columns:1fr}.prod-ehr header{align-items:flex-start;flex-direction:column}}
      `}</style>
      <header><div><h1>Revealing Leads to Healing EHR</h1><div className="muted">AWS production workspace</div></div><div>{user.fullName} · {user.role} <button className="secondary" onClick={logout}>Sign out</button></div></header>
      <div className="shell">
        <aside>
          <button className={tab === "clients" ? "active" : ""} onClick={() => setTab("clients")}>Clients</button>
          <button className={tab === "notes" ? "active" : ""} onClick={() => setTab("notes")}>Clinical Notes</button>
          <button className={tab === "telehealth" ? "active" : ""} onClick={() => setTab("telehealth")}>Telehealth Scribe</button>
          {['owner','provider','auditor'].includes(user.role) && <button className={tab === "audit" ? "active" : ""} onClick={loadAudit}>Audit Log</button>}
        </aside>
        <section className="content">
          {error && <div className="alert">{error}</div>}{notice && <div className="notice">{notice}</div>}
          {tab === "clients" && <div className="grid"><div className="panel"><h2>Authorized clients</h2><p className="muted">Only charts assigned to this authenticated account are returned.</p>{clients.map((client) => <button key={client.clientId} className={`client-row ${selectedClientId===client.clientId?'selected':''}`} onClick={() => setSelectedClientId(client.clientId)}><strong>{client.fullName}</strong><br/><span className="muted">{client.status} · {client.clientId}</span></button>)}</div>{['owner','provider'].includes(user.role) && <div className="panel"><h2>Create client chart</h2>{Object.entries(clientForm).map(([key,value]) => <label key={key}>{key.replace(/([A-Z])/g,' $1')}<input type={key==='dateOfBirth'?'date':'text'} value={value} onChange={(e)=>setClientForm({...clientForm,[key]:e.target.value})}/></label>)}<div className="actions"><button disabled={busy||!clientForm.fullName.trim()} onClick={createClient}>Create encrypted chart</button></div></div>}</div>}
          {tab === "notes" && <div className="grid"><div className="panel"><h2>New clinical note draft</h2><p className="muted">Selected chart: {selectedClient?.fullName || "None"}</p><label>Note type<select value={noteForm.noteType} onChange={(e)=>setNoteForm({...noteForm,noteType:e.target.value})}><option value="progress">Progress note</option><option value="biopsychosocial">Biopsychosocial</option><option value="treatment-plan">Treatment plan</option><option value="psychotherapy-note">Restricted psychotherapy note</option></select></label><label>Service date<input type="date" value={noteForm.serviceDate} onChange={(e)=>setNoteForm({...noteForm,serviceDate:e.target.value})}/></label><label>Clinical content<textarea value={noteForm.content} onChange={(e)=>setNoteForm({...noteForm,content:e.target.value})}/></label><div className="actions"><button disabled={busy||!selectedClientId||!noteForm.content.trim()} onClick={saveClinicalNote}>Save draft</button></div></div><div className="panel"><h2>Chart records</h2>{records.length===0?<p className="muted">No records in this chart.</p>:records.map((record)=><article className="record" key={record.recordId}><strong>{record.recordType}</strong> · {record.status}<div className="muted">{new Date(record.createdAt).toLocaleString()}</div><pre>{JSON.stringify(record.payload,null,2)}</pre></article>)}</div></div>}
          {tab === "telehealth" && <div className="panel"><h2>Telehealth clinical scribe</h2><p className="muted">Selected chart: {selectedClient?.fullName || "None"}. Capture consented microphone audio, upload a consented audio file, or paste a transcript.</p><label><input style={{width:'auto'}} type="checkbox" checked={scribe.consent} onChange={(e)=>setScribe({...scribe,consent:e.target.checked})}/> Recording and AI-scribe consent documented</label><label>Note template<select value={scribe.template} onChange={(e)=>setScribe({...scribe,template:e.target.value})}><option value="BEHAVIORAL_SOAP">Behavioral SOAP</option><option value="GIRPP">GIRPP</option><option value="BIRP">BIRP</option><option value="DAP">DAP</option><option value="SIRP">SIRP</option></select></label><div className="actions">{recording?<button onClick={stopRecording}>Stop and securely transcribe</button>:<button disabled={busy||!scribe.consent||!selectedClientId} onClick={startRecording}>Start consented audio capture</button>}<label className="link-button" style={{cursor:'pointer'}}>Upload consented audio<input hidden type="file" accept="audio/*" onChange={(e)=>uploadAudioFile(e.target.files?.[0])}/></label>{scribeJob.jobName&&<button className="secondary" disabled={busy} onClick={checkScribeJob}>Check AWS transcription</button>}</div>{scribeJob.status&&<p className="security">HealthScribe job status: {scribeJob.status}</p>}<label>Transcript<textarea value={scribe.transcript} onChange={(e)=>setScribe({...scribe,transcript:e.target.value})}/></label><div className="actions"><button onClick={generateScribeDraft}>Generate preliminary draft from pasted transcript</button><button className="secondary" disabled={busy||!scribe.draft||!selectedClientId} onClick={saveScribeDraft}>Save reviewed draft to chart</button></div>{scribe.draft&&<div className="record"><pre>{scribe.draft}</pre></div>}<div className="security">AI output remains a draft until a licensed provider reviews, edits, and signs it. Temporary audio is deleted after successful retrieval and also has a one-day lifecycle backstop.</div></div>}
          {tab === "audit" && <div className="panel"><h2>Append-only audit events</h2>{auditEvents.map((event)=><article className="record" key={event.auditId}><strong>{event.action}</strong><div className="muted">{event.timestamp} · {event.actorName} · {event.category}</div></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
