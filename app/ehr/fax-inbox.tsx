"use client";

import { useEffect, useState } from "react";

type SpruceInboxItem = {
  itemId: string;
  kind: "fax" | "call";
  fromNumber: string;
  createdAt: string;
  status: string;
  linkedClientId: string;
  hasFile: boolean;
};

type ChartClient = { id: string; label: string };

/**
 * Provider-only inbox. Reads the Spruce-captured store (faxes and call
 * recordings the Spruce webhook already saved under the spruce-inbox/ prefix),
 * lets the provider open the stored document, and files a fax into a selected
 * client's chart. The optional synthetic rehearsal stays on this page and never
 * sends a fax or changes a real chart.
 */
export default function FaxInbox({ clients = [] }: { clients?: ChartClient[] }) {
  const [items, setItems] = useState<SpruceInboxItem[] | null>(null);
  const [inboxError, setInboxError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [opening, setOpening] = useState("");
  const [attachTarget, setAttachTarget] = useState("");
  const [attachClient, setAttachClient] = useState("");
  const [attachBusy, setAttachBusy] = useState("");
  const [attachNotice, setAttachNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setItems(null);
    setInboxError("");
    fetch("/api/ehr/spruce-inbox", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load the Spruce inbox.");
        return body;
      })
      .then((body) => {
        if (!controller.signal.aborted) setItems(Array.isArray(body.items) ? body.items : []);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setInboxError(error.message);
      });
    return () => controller.abort();
  }, [refresh]);

  async function openItem(item: SpruceInboxItem) {
    setOpening(item.itemId);
    setInboxError("");
    const fileWindow = window.open("about:blank", "_blank");
    if (fileWindow) fileWindow.opener = null;
    try {
      const response = await fetch(
        `/api/ehr/spruce-inbox?id=${encodeURIComponent(item.itemId)}&createdAt=${encodeURIComponent(item.createdAt)}`,
        { credentials: "same-origin", cache: "no-store" }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not open the item.");
      if (!fileWindow) throw new Error("Allow this EHR to open a new tab, then try again.");
      fileWindow.location.href = body.viewUrl;
    } catch (error: any) {
      fileWindow?.close();
      setInboxError(error.message);
    } finally {
      setOpening("");
    }
  }

  async function attachToChart(item: SpruceInboxItem) {
    if (!attachClient) {
      setAttachNotice("Choose a client chart first.");
      return;
    }
    setAttachBusy(item.itemId);
    setAttachNotice("");
    setInboxError("");
    try {
      const response = await fetch("/api/ehr/spruce-inbox/attach", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.itemId, createdAt: item.createdAt, clientId: attachClient }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not attach this item to the chart.");
      setAttachNotice("Filed to the selected chart.");
      setAttachTarget("");
      setAttachClient("");
      setRefresh((value) => value + 1);
    } catch (error: any) {
      setAttachNotice(error.message);
    } finally {
      setAttachBusy("");
    }
  }

  function formatReceived(value: string) {
    if (!value) return "Unknown";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
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
  const loaded = Array.isArray(items);

  return (
    <section aria-labelledby="fax-inbox-heading" className="my-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="fax-inbox-heading" className="text-lg font-semibold">Spruce inbox</h2>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-900">{loaded ? "Spruce inbox connected" : "Loading inbox"}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">Inbound faxes and call recordings captured from Spruce. Open a document to review it, then file a fax into a client chart.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => setRefresh((value) => value + 1)}>Refresh inbox</button>
        <button type="button" className={button} aria-expanded={rehearsal} onClick={() => { reset(); setRehearsal(!rehearsal); }}>
          {rehearsal ? "Close rehearsal" : "Try a synthetic fax rehearsal"}
        </button>
      </div>
      {inboxError ? <p role="alert" className="mt-3 text-sm text-red-800">{inboxError}</p> : null}
      {attachNotice ? <p role="status" className="mt-3 text-sm text-slate-700">{attachNotice}</p> : null}
      {!rehearsal ? (
        <div className="mt-4 space-y-3">
          {!loaded && !inboxError ? <p role="status" className="text-sm">Loading Spruce inbox…</p> : null}
          {loaded && items!.length === 0 ? <p className="text-sm">No Spruce items yet. Inbound faxes and call recordings will appear here as they arrive.</p> : null}
          {(items || []).map((item) => (
            <div key={`${item.createdAt}:${item.itemId}`} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.kind === "fax" ? "Fax" : "Call recording / voicemail"}{item.fromNumber ? ` · from ${item.fromNumber}` : ""}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{item.status}</span>
              </div>
              <p className="mt-1 text-sm">Received: {formatReceived(item.createdAt)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={button} disabled={!item.hasFile || Boolean(opening)} onClick={() => openItem(item)}>
                  {opening === item.itemId ? "Opening…" : item.kind === "fax" ? "Open PDF" : "Open recording"}
                </button>
                {item.kind === "fax" ? (
                  attachTarget === item.itemId ? (
                    <button type="button" className={button} onClick={() => { setAttachTarget(""); setAttachClient(""); }}>Cancel</button>
                  ) : (
                    <button type="button" className={button} disabled={!item.hasFile} onClick={() => { setAttachTarget(item.itemId); setAttachClient(""); setAttachNotice(""); }}>Attach to chart</button>
                  )
                ) : (
                  <span className="self-center text-xs text-slate-500">Listen-only</span>
                )}
              </div>
              {attachTarget === item.itemId ? (
                <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                  <label className="block text-sm font-medium" htmlFor={`attach-client-${item.itemId}`}>Client chart</label>
                  <select
                    id={`attach-client-${item.itemId}`}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2"
                    value={attachClient}
                    onChange={(event) => setAttachClient(event.target.value)}
                  >
                    <option value="">Choose a client chart</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.label}</option>
                    ))}
                  </select>
                  {clients.length === 0 ? <p className="text-sm text-slate-600">No client charts are available to you.</p> : null}
                  <button type="button" className={button} disabled={!attachClient || Boolean(attachBusy)} onClick={() => attachToChart(item)}>
                    {attachBusy === item.itemId ? "Filing…" : "File to this chart"}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
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
