'use client';
import { useState } from 'react';
export default function TelehealthEntry() {
  const [notice, setNotice] = useState('');
  return <section className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-5" aria-labelledby="telehealth-entry-heading">
    <h2 id="telehealth-entry-heading" className="text-lg font-semibold">Your personal telehealth link</h2>
    <p className="my-2">This is your private, recurring telehealth link. It is used for every session and is connected to your provider&rsquo;s room. Access is secured through your own patient portal login. Sign in with your own account to reach your private waiting room; your provider opens the session when ready.</p>
    <p className="mb-3 text-sm">Your signed intake agreements stay in Signed Documents. The EHR presents a brief confirmation each session; a new paperwork packet is not sent for each visit.</p>
    <a className="mr-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white" href="/ehr/telehealth">Join telehealth</a>
    <button type="button" className="rounded-lg border border-blue-300 px-4 py-2" onClick={async () => {
      try { await navigator.clipboard.writeText(new URL('/ehr/telehealth', window.location.origin).href); setNotice('Link copied. Bookmark it for future appointments. Signing in opens only your own room.'); }
      catch { setNotice('Open Join telehealth and bookmark that page in your browser.'); }
    }}>Copy recurring link</button>
    {notice ? <p className="mt-2 text-sm" role="status">{notice}</p> : null}
    <a className="mt-3 block underline" href="/ehr/documents#signed-documents">View your signed documents</a>
  </section>;
}
