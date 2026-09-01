"use client";
import { useRef, useState } from "react";
import { buildFaxActivity, faxActivityStatuses, type FaxActivityInput } from "../../lib/ehr/fax-activity";
type Props = { clientName: string; appointmentId: string; notes: Array<{ id: string; title?: string }>; entries: Array<{ id: string; generatedLetterText?: string }>; locked: boolean; onSave: (input: FaxActivityInput) => Promise<void> };
export default function FaxActivity({ clientName, appointmentId, notes, entries, locked, onSave }: Props) {
  const blank = { recipient: "", description: "", status: faxActivityStatuses[0] as string, occurredAt: "", evidence: "", noteId: "", authorizationConfirmed: false };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef<FaxActivityInput | null>(null);
  async function save() {
    if (busy || locked || !appointmentId) return;
    setBusy(true); setNotice("");
    try {
      const candidate = pending.current || { ...form, id: `fax-activity-${crypto.randomUUID()}` };
      buildFaxActivity(candidate, { clientId: "validation", appointmentId, actorId: "validation", actorName: "", recordedAt: new Date().toISOString() });
      pending.current = candidate;
      await onSave(candidate); pending.current = null; setForm(blank); setNotice("Fax activity saved to the chart and audit log. No fax was sent and no billing charge was created."); }
    catch (e) { setNotice(`${e instanceof Error ? e.message : "Save not confirmed."} Review the entry and retry; the same record ID is retained.`); }
    finally { setBusy(false); }
  }
  function change(patch: Partial<typeof form>) { if (!pending.current) setForm(current => ({ ...current, ...patch })); }
  const field = "block w-full rounded-xl border p-2";
  return <section className="my-4 rounded-2xl border p-4 space-y-3" aria-label="Fax session documentation">
    <h2 className="font-semibold">Fax activity — chart documentation</h2>
    <p>{clientName} · Appointment: {appointmentId || "Select an appointment in Telehealth first"}</p>
    <p className="text-sm">Document planned fax work or a result reported from another fax system. This does not transmit a fax or verify delivery. Saved entries are non-billable supporting documents; signed notes are not changed.</p>
    <fieldset disabled={busy || locked || !appointmentId} className="space-y-3">
      <label className="block">Fax activity status<select className={field} value={form.status} onChange={e => change({ status: e.target.value })}>{faxActivityStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
      <label className="block">Fax recipient or source<input className={field} maxLength={300} value={form.recipient} onChange={e => change({ recipient: e.target.value })} /></label>
      <label className="block">Fax material and purpose<textarea className={field} maxLength={4000} value={form.description} onChange={e => change({ description: e.target.value })} /></label>
      <label className="block">Fax activity date and time<input className={field} type="datetime-local" value={form.occurredAt} onChange={e => change({ occurredAt: e.target.value })} /></label>
      <label className="block">Fax result evidence or receipt reference<textarea className={field} maxLength={2000} value={form.evidence} onChange={e => change({ evidence: e.target.value })} /></label>
      <label className="block">Link to existing session note<select className={field} value={form.noteId} onChange={e => change({ noteId: e.target.value })}><option value="">Appointment only — no note selected</option>{notes.map(note => <option key={note.id} value={note.id}>{note.title || note.id}</option>)}</select></label>
      <label className="block"><input type="checkbox" checked={form.authorizationConfirmed} onChange={e => change({ authorizationConfirmed: e.target.checked })} /> I verified the chart, recipient/source and applicable disclosure authorization.</label>
      <button type="button" className="rounded-xl border px-4 py-2" onClick={save}>{busy ? "Saving fax activity…" : "Save fax activity to chart"}</button>
    </fieldset>
    {notice && <p role="status">{notice}</p>}
    <h3 className="font-semibold">Recorded fax activity for this session</h3>
    {entries.length === 0 && <p>No fax activity recorded for this session.</p>}
    {entries.map(entry => <details key={entry.id} className="rounded-xl border p-3"><summary>Saved fax activity</summary><p className="whitespace-pre-wrap">{entry.generatedLetterText}</p></details>)}
  </section>;
}
