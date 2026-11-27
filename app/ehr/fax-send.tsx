"use client";

import { useEffect, useRef, useState } from "react";

type ChartClient = { id: string; label: string };
type SentFax = {
  faxId: string;
  createdAt: string;
  status: string;
  mode: string;
  destinationMasked: string;
  source: string;
  clientId: string;
  sentByName: string;
};
type ChartDocument = { documentId: string; title: string };

const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
const field = "w-full rounded-lg border border-slate-300 bg-white p-2";

function newToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Mirrors lib/ehr/outbound-fax.ts so the form can show a problem before the
// server checks again. The server is the authority.
function normalizeUsFax(value: string) {
  if (!/^[\d\s().+-]+$/.test(value.trim())) return "";
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? digits : "";
}

function statusLabel(status: string) {
  if (status === "accepted") return "Accepted by Spruce";
  if (status === "dry-run") return "Dry run only (not sent)";
  if (status === "failed") return "Failed";
  return "Pending";
}

/**
 * Provider-only "Send fax" panel. Sends through the server route, which holds
 * the Spruce token; the browser never sees it. A confirm screen shows the last
 * four digits of the number and the document before anything is sent.
 */
export default function FaxSend({ clients = [] }: { clients?: ChartClient[] }) {
  const [mode, setMode] = useState<"off" | "dry-run" | "live" | "">("");
  const [history, setHistory] = useState<SentFax[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const [faxNumber, setFaxNumber] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [source, setSource] = useState<"upload" | "chart">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [clientId, setClientId] = useState("");
  const [documents, setDocuments] = useState<ChartDocument[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [docsError, setDocsError] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const tokenRef = useRef(newToken());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setHistoryError("");
    fetch("/api/ehr/spruce-fax", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load sent faxes.");
        return body;
      })
      .then((body) => {
        if (controller.signal.aborted) return;
        setMode(body.mode || "off");
        setHistory(Array.isArray(body.items) ? body.items : []);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setHistoryError(err.message);
      });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    setDocuments([]);
    setDocumentId("");
    setDocsError("");
    if (source !== "chart" || !clientId) return;
    const controller = new AbortController();
    fetch(`/api/ehr/spruce-fax?clientId=${encodeURIComponent(clientId)}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load chart documents.");
        return body;
      })
      .then((body) => {
        if (!controller.signal.aborted) setDocuments(Array.isArray(body.documents) ? body.documents : []);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setDocsError(err.message);
      });
    return () => controller.abort();
  }, [source, clientId]);

  const digits = normalizeUsFax(faxNumber);
  const chosenDocument = documents.find((doc) => doc.documentId === documentId);
  const documentName = source === "upload" ? file?.name || "" : chosenDocument?.title || "";
  const hasDocument = source === "upload" ? Boolean(file) : Boolean(clientId && documentId);
  const sendDisabled = mode !== "dry-run" && mode !== "live";
  const canReview = !sendDisabled && Boolean(digits) && hasDocument;

  function reset() {
    setFaxNumber("");
    setCoverNote("");
    setFile(null);
    setClientId("");
    setDocumentId("");
    setAuthorized(false);
    setStep("form");
    tokenRef.current = newToken();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function review() {
    setError("");
    setNotice("");
    if (!digits) return setError("Enter a valid 10-digit US fax number.");
    if (!hasDocument) return setError("Attach a PDF to fax.");
    if (source === "upload" && file && file.size > 4 * 1024 * 1024) return setError("That PDF is larger than 4 MB. Choose a smaller file.");
    setAuthorized(false);
    setStep("confirm");
  }

  async function send() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.append("faxNumber", faxNumber);
      form.append("coverNote", coverNote);
      form.append("sendToken", tokenRef.current);
      form.append("authorizationConfirmed", authorized ? "true" : "false");
      form.append("source", source);
      if (source === "upload" && file) form.append("file", file);
      if (source === "chart") {
        form.append("clientId", clientId);
        form.append("documentId", documentId);
      }
      const response = await fetch("/api/ehr/spruce-fax", { method: "POST", credentials: "same-origin", cache: "no-store", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The fax could not be sent.");
      setNotice(
        body.status === "dry-run"
          ? "Dry run recorded. No fax was sent."
          : "Spruce accepted the fax. Delivery is not confirmed by Spruce, so check the sent history."
      );
      reset();
      setRefresh((value) => value + 1);
    } catch (err: any) {
      setError(err.message);
      // A failed or rejected attempt must not reuse its confirmation token.
      tokenRef.current = newToken();
      setStep("form");
      setRefresh((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  function formatTime(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }

  return (
    <section aria-labelledby="fax-send-heading" className="my-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="fax-send-heading" className="text-lg font-semibold">Send a fax</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">
          {mode === "live" ? "Sending is on" : mode === "dry-run" ? "Dry-run mode: nothing is sent" : mode === "off" ? "Sending is turned off" : "Checking status"}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">Faxes go out from the practice fax line (914) 371-3845 through Spruce. You do not need to open Spruce.</p>
      {mode === "off" ? <p role="status" className="mt-3 text-sm text-amber-900">Fax sending is turned off for this practice, so the form is disabled.</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-800">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 text-sm text-slate-700">{notice}</p> : null}

      {step === "form" ? (
        <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); review(); }}>
          <fieldset disabled={sendDisabled} className="space-y-3">
            <div>
              <label className="block text-sm font-medium" htmlFor="fax-send-number">Recipient fax number (US)</label>
              <input id="fax-send-number" type="tel" inputMode="tel" autoComplete="off" className={field} value={faxNumber} onChange={(event) => setFaxNumber(event.target.value)} placeholder="(555) 555-0123" />
              {faxNumber && !digits ? <p role="alert" className="mt-1 text-sm text-red-800">Enter a valid 10-digit US fax number.</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="fax-send-note">Cover note (optional, up to 500 characters)</label>
              <textarea id="fax-send-note" className={field} rows={3} maxLength={500} value={coverNote} onChange={(event) => setCoverNote(event.target.value)} />
              <p className="mt-1 text-xs text-slate-600">Keep patient details out of the cover note unless the recipient needs them.</p>
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="fax-send-source">PDF to send</label>
              <select id="fax-send-source" className={field} value={source} onChange={(event) => setSource(event.target.value === "chart" ? "chart" : "upload")}>
                <option value="upload">Upload a PDF from this computer</option>
                <option value="chart">Choose a PDF from a client chart</option>
              </select>
            </div>
            {source === "upload" ? (
              <div>
                <label className="block text-sm font-medium" htmlFor="fax-send-file">PDF file (up to 4 MB)</label>
                <input id="fax-send-file" ref={fileInputRef} type="file" accept="application/pdf,.pdf" className={field} onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium" htmlFor="fax-send-client">Client chart</label>
                <select id="fax-send-client" className={field} value={clientId} onChange={(event) => setClientId(event.target.value)}>
                  <option value="">Choose a client chart</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
                </select>
                {clientId ? (
                  <>
                    <label className="block text-sm font-medium" htmlFor="fax-send-document">Document</label>
                    <select id="fax-send-document" className={field} value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
                      <option value="">Choose a PDF document</option>
                      {documents.map((doc) => <option key={doc.documentId} value={doc.documentId}>{doc.title}</option>)}
                    </select>
                    {docsError ? <p role="alert" className="text-sm text-red-800">{docsError}</p> : null}
                    {!docsError && documents.length === 0 ? <p className="text-sm text-slate-600">No faxable PDF documents in this chart.</p> : null}
                  </>
                ) : null}
              </div>
            )}
            <button type="submit" className={button} disabled={!canReview}>Review before sending</button>
          </fieldset>
        </form>
      ) : (
        <div className="mt-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4" aria-label="Confirm fax before sending">
          <p className="font-semibold text-blue-950">Confirm before sending</p>
          <ul className="space-y-1 text-sm text-blue-950">
            <li>To: fax number ending {digits.slice(-4)}</li>
            <li>Document: {documentName || "PDF"}</li>
            <li>Cover note: {coverNote.trim() ? "Included" : "None"}</li>
            <li>Mode: {mode === "dry-run" ? "Dry run (nothing will be sent)" : "Live send"}</li>
          </ul>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} />
            I confirmed the recipient, the document, and that disclosure to this recipient is authorized.
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={!authorized || busy} onClick={send}>{busy ? "Sending…" : mode === "dry-run" ? "Record dry run" : "Send fax"}</button>
            <button type="button" className={button} disabled={busy} onClick={() => setStep("form")}>Back</button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Sent faxes</h3>
          <button type="button" className={button} onClick={() => setRefresh((value) => value + 1)}>Refresh</button>
        </div>
        {historyError ? <p role="alert" className="mt-2 text-sm text-red-800">{historyError}</p> : null}
        {history && history.length === 0 ? <p className="mt-2 text-sm">No faxes sent from the EHR yet.</p> : null}
        <div className="mt-2 space-y-2">
          {(history || []).map((item) => (
            <div key={item.faxId} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">To {item.destinationMasked || "unknown"}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{statusLabel(item.status)}</span>
              </div>
              <p className="mt-1 text-slate-600">{formatTime(item.createdAt)}{item.sentByName ? ` · ${item.sentByName}` : ""}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">“Accepted by Spruce” means Spruce took the fax for delivery. Spruce does not report final delivery through its API.</p>
      </div>
    </section>
  );
}
