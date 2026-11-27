"use client";

import { useEffect, useState } from "react";

/** Provider-only business email inbox. Mirrors fax-inbox.tsx. */
export default function EmailPage() {
  const [inbox, setInbox] = useState<any>(null);
  const [inboxError, setInboxError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [cursor, setCursor] = useState("");
  const [opening, setOpening] = useState("");
  const [openMessage, setOpenMessage] = useState<any>(null);

  useEffect(() => {
    const controller = new AbortController();
    setInbox(null); setInboxError("");
    fetch(`/api/ehr/email/inbox${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not load the email inbox."); return body; })
      .then(body => { if (!controller.signal.aborted) setInbox(body); })
      .catch(error => { if (!controller.signal.aborted) setInboxError(error.message); });
    return () => controller.abort();
  }, [refresh, cursor]);

  // Compose / reply form state.
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [inReplyTo, setInReplyTo] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");
  const [sendError, setSendError] = useState("");

  async function openEmail(id: string) {
    setOpening(id); setInboxError(""); setOpenMessage(null);
    try {
      const response = await fetch(`/api/ehr/email/inbox?id=${encodeURIComponent(id)}`, { credentials: "same-origin", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not open the message.");
      setOpenMessage({ id, ...body });
    } catch (error: any) { setInboxError(error.message); }
    finally { setOpening(""); }
  }

  function replyTo(message: any) {
    setTo(message.from || "");
    const subj = message.subject || "";
    setSubject(/^re:/i.test(subj) ? subj : `Re: ${subj}`);
    setInReplyTo(message.messageId || "");
    setText("");
    setSendStatus(""); setSendError("");
  }

  async function sendEmail(event: any) {
    event.preventDefault();
    setSending(true); setSendStatus(""); setSendError("");
    try {
      const recipients = to.split(",").map(value => value.trim()).filter(Boolean);
      const response = await fetch("/api/ehr/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ to: recipients, subject, text, inReplyTo: inReplyTo || undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The email could not be sent.");
      setSendStatus(body.status || "sent");
    } catch (error: any) { setSendError(error.message); }
    finally { setSending(false); }
  }

  const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
  const field = "w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";

  return (
    <section aria-labelledby="email-inbox-heading" className="my-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="email-inbox-heading" className="text-lg font-semibold">Business email</h2>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-900">{inbox?.configured ? "Inbox storage connected" : "Email service not connected"}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">Read received messages at connect@rlth.org and send or reply from the practice address.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => setRefresh(value => value + 1)}>Refresh inbox</button>
      </div>
      {inboxError ? <p role="alert" className="mt-3 text-sm text-red-800">{inboxError}</p> : null}

      <div className="mt-4 space-y-3">
        {!inbox && !inboxError ? <p role="status" className="text-sm">Loading email inbox…</p> : null}
        {inbox && !inbox.configured ? <p className="rounded-lg bg-slate-50 p-4 text-sm">No connected email feed. Incoming messages cannot be received here yet.</p> : null}
        {inbox?.configured && !inbox.items?.length ? <p className="text-sm">No received messages on this page.</p> : null}
        {(inbox?.items || []).map((message: any) => <div key={message.id} className="rounded-lg border p-4">
          <p className="font-medium break-all">{message.id}</p>
          <p className="mt-1 text-sm">Received: {message.receivedAt || "—"}</p>
          <button type="button" className={`${button} mt-2`} disabled={Boolean(opening)} onClick={() => openEmail(message.id)}>{opening === message.id ? "Opening…" : "Open message"}</button>
        </div>)}
        <div className="flex gap-2">
          {cursor ? <button type="button" className={button} onClick={() => setCursor("")}>First page</button> : null}
          {inbox?.nextCursor ? <button type="button" className={button} onClick={() => setCursor(inbox.nextCursor)}>Next page</button> : null}
        </div>
      </div>

      {openMessage ? (
        <div className="mt-4 space-y-2 rounded-lg border p-4" aria-label="Opened email message">
          <p className="text-sm"><span className="font-medium">From:</span> {openMessage.from || "—"}</p>
          <p className="text-sm"><span className="font-medium">Subject:</span> {openMessage.subject || "—"}</p>
          <p className="text-sm"><span className="font-medium">Date:</span> {openMessage.date || "—"}</p>
          {openMessage.text ? (
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm">{openMessage.text}</pre>
          ) : openMessage.html ? (
            // The API returns an already-sanitized HTML string (lib/ehr/inbound-email.ts sanitizeHtml).
            <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm" dangerouslySetInnerHTML={{ __html: openMessage.html }} />
          ) : (
            <p className="mt-2 text-sm text-slate-600">This message has no readable body.</p>
          )}
          <button type="button" className={`${button} mt-2`} onClick={() => replyTo(openMessage)}>Reply</button>
        </div>
      ) : null}

      <form className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5" onSubmit={sendEmail}>
        <h3 className="text-base font-semibold">{inReplyTo ? "Reply" : "Compose"}</h3>
        <div>
          <label className="block text-sm font-medium" htmlFor="email-to">To</label>
          <input id="email-to" className={field} type="text" value={to} onChange={event => setTo(event.target.value)} placeholder="name@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="email-subject">Subject</label>
          <input id="email-subject" className={field} type="text" value={subject} onChange={event => setSubject(event.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="email-text">Message</label>
          <textarea id="email-text" className={`${field} min-h-32`} value={text} onChange={event => setText(event.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={button} disabled={sending}>{sending ? "Sending…" : "Send email"}</button>
          {inReplyTo ? <button type="button" className={button} onClick={() => { setInReplyTo(""); setTo(""); setSubject(""); setText(""); setSendStatus(""); setSendError(""); }}>Clear reply</button> : null}
          {sendStatus ? <span role="status" className="text-sm text-green-800">Email {sendStatus}.</span> : null}
        </div>
        {sendError ? <p role="alert" className="text-sm text-red-800">{sendError}</p> : null}
      </form>
    </section>
  );
}
