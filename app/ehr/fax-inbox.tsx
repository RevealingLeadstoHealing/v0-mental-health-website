"use client";

import { useEffect, useState } from "react";

/** Provider-only inbox. Rehearsal state never leaves this component. */
export default function FaxInbox() {
  const [inbox, setInbox] = useState<any>(null);
  const [inboxError, setInboxError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [cursor, setCursor] = useState("");
  const [opening, setOpening] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setInbox(null); setInboxError("");
    fetch(`/api/ehr/fax/inbox${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not load the fax inbox."); return body; })
      .then(body => { if (!controller.signal.aborted) setInbox(body); })
      .catch(error => { if (!controller.signal.aborted) setInboxError(error.message); });
    return () => controller.abort();
  }, [refresh, cursor]);
  async function openFax(id: string) {
    setOpening(id); setInboxError("");
    const fileWindow = window.open("about:blank", "_blank");
    if (fileWindow) fileWindow.opener = null;
    try {
      const response = await fetch(`/api/ehr/fax/inbox?id=${encodeURIComponent(id)}`, { credentials: "same-origin", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not open the fax.");
      if (!fileWindow) throw new Error("Allow this EHR to open a new tab, then try again.");
      fileWindow.location.href = body.downloadUrl;
    } catch (error: any) { fileWindow?.close(); setInboxError(error.message); }
    finally { setOpening(""); }
  }
  const [rehearsal, setRehearsal] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [destination, setDestination] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [attached, setAttached] = useState(false);

  function reset() {
    setReviewed(false);
    setDestination("");
    setConfirmed(false);
    setAttached(false);
  }

  const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section aria-labelledby="fax-inbox-heading" className="my-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="fax-inbox-heading" className="text-lg font-semibold">Business fax inbox</h2>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-900">{inbox?.configured ? "Inbox storage connected · delivery not verified" : "Fax service not connected"}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">Review received documents here. Chart assignment and outgoing fax delivery are not activated yet.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={button} disabled>Send fax — not connected</button>
        <button type="button" className={button} onClick={() => setRefresh(value => value + 1)}>Refresh inbox</button>
        <button type="button" className={button} aria-expanded={rehearsal} onClick={() => { reset(); setRehearsal(!rehearsal); }}>
          {rehearsal ? "Close rehearsal" : "Try a synthetic fax rehearsal"}
        </button>
      </div>
      {inboxError ? <p role="alert" className="mt-3 text-sm text-red-800">{inboxError}</p> : null}
      {!rehearsal ? (
        <div className="mt-4 space-y-3">
          {!inbox && !inboxError ? <p role="status" className="text-sm">Loading fax inbox…</p> : null}
          {inbox && !inbox.configured ? <p className="rounded-lg bg-slate-50 p-4 text-sm">No connected fax feed. Incoming faxes cannot be received here yet.</p> : null}
          {inbox?.configured && !inbox.items?.length ? <p className="text-sm">No received faxes on this page.</p> : null}
          {(inbox?.items || []).map((fax: any) => <div key={fax.id} className="rounded-lg border p-4">
            <p className="font-medium">{fax.title}</p>
            <p className="mt-1 text-sm">Received: {fax.receivedAt} · Awaiting chart assignment</p>
            <button type="button" className={`${button} mt-2`} disabled={Boolean(opening)} onClick={() => openFax(fax.id)}>{opening === fax.id ? "Opening…" : "Open received PDF"}</button>
          </div>)}
          <div className="flex gap-2">
            {cursor ? <button type="button" className={button} onClick={() => setCursor("")}>First page</button> : null}
            {inbox?.nextCursor ? <button type="button" className={button} onClick={() => setCursor(inbox.nextCursor)}>Next page</button> : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="font-semibold text-blue-950">Synthetic rehearsal — no real fax or chart changes</p>
          <p className="text-sm text-blue-950">This sample stays on this page and resets when closed. It does not send a fax, save a document, or contact a carrier.</p>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">Sample referral · 1 page</p>
              <span className="text-sm">{attached ? "Assigned in rehearsal" : "Needs chart assignment"}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">From: Synthetic referral office</p>
            <button type="button" className={`${button} mt-3`} onClick={() => setReviewed(true)}>Review sample document</button>
            {reviewed ? (
              <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3" aria-label="Synthetic document preview">
                <p className="font-medium">SYNTHETIC DOCUMENT — FOR WORKFLOW TESTING ONLY</p>
                <p>Client: Synthetic Fax Client A</p>
                <p>Reference: TEST-FAX-A</p>
                <p>Purpose: Demonstrate review and chart selection. No clinical findings.</p>
              </div>
            ) : null}
          </div>
          {!attached ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="fax-rehearsal-chart">Destination chart (synthetic only)</label>
              <select id="fax-rehearsal-chart" className="w-full rounded-lg border border-slate-300 bg-white p-2" value={destination} onChange={event => { setDestination(event.target.value); setConfirmed(false); }}>
                <option value="">Choose a synthetic chart</option>
                <option value="TEST-FAX-A">Synthetic Fax Client A — TEST-FAX-A</option>
                <option value="TEST-FAX-B">Synthetic Fax Client B — TEST-FAX-B</option>
              </select>
              {destination && destination !== "TEST-FAX-A" ? <p role="alert" className="text-sm text-red-800">This chart does not match the sample document. Choose Synthetic Fax Client A.</p> : null}
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" disabled={!reviewed || destination !== "TEST-FAX-A"} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
                I reviewed the document and confirmed its client and reference match the selected chart.
              </label>
              <button type="button" className={button} disabled={!reviewed || !confirmed || destination !== "TEST-FAX-A"} onClick={() => { if (reviewed && confirmed && destination === "TEST-FAX-A") setAttached(true); }}>Simulate attachment to chart</button>
            </div>
          ) : (
            <div role="status" className="space-y-2 rounded-lg bg-white p-3">
              <p>Rehearsal complete: Sample referral assigned to Synthetic Fax Client A. No real chart was updated.</p>
              <button type="button" className={button} onClick={reset}>Reset rehearsal</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
