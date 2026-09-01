'use client';
import { useEffect, useState } from 'react';

export default function SignedDocuments({ clientId }: { clientId: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [notice, setNotice] = useState('Loading signed copies…');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setDocuments([]); setNotice('Loading signed copies…');
    fetch(`/api/ehr/signed-documents?clientId=${encodeURIComponent(clientId)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to load signed documents.'); return result; })
      .then(result => { setDocuments(result.documents); setNotice(result.documents.length ? '' : 'No signed copies are available yet.'); })
      .catch(error => { if (!controller.signal.aborted) setNotice(error.message); });
    return () => controller.abort();
  }, [clientId, revision]);
  function download(copy: any) {
    const text = `${copy.title}\n\n${copy.text || 'The document content is in the attached original file.'}\n\nSigned by: ${copy.signature.signer}\nRole: Client\nSigned at: ${copy.signature.signedAt}\nCopy reference: ${copy.id}\n${copy.fileName ? `Original file: ${copy.fileName}` : ''}`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `signed-document-${copy.id.slice(0,12)}.txt`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function openOriginal(copy: any) {
    try {
      const response = await fetch(`/api/ehr/documents/presign?clientId=${encodeURIComponent(clientId)}&key=${encodeURIComponent(copy.storageKey)}`, { cache: 'no-store' });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to open the original file.');
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) { setNotice(error.message); }
  }
  return <section id="signed-documents" className="mb-4 rounded-2xl border bg-white p-5 shadow-sm" aria-labelledby="signed-documents-heading">
    <h2 id="signed-documents-heading" className="text-lg font-semibold">Signed Documents</h2>
    <p className="mt-2 text-sm text-slate-600">View and download your signed forms and agreements. Copies remain available when a later version is added. For uploaded forms, open the original file as well as the signature copy.</p>
    <button type="button" className="my-3 rounded-lg border px-3 py-2" onClick={() => setRevision(value => value + 1)}>Refresh signed copies</button>
    {notice ? <p role="status">{notice}</p> : null}
    <div className="space-y-3">{documents.map(copy => <article key={copy.id} className="rounded-lg border p-4">
      <h3 className="font-semibold">{copy.title}</h3>
      <p className="text-sm">Signed by {copy.signature.signer} · {new Date(copy.signature.signedAt).toLocaleString()}</p>
      <details className="my-2"><summary>View signed copy</summary><p className="mt-2 whitespace-pre-wrap">{copy.text || 'See the original file for document content.'}</p></details>
      <button type="button" className="mr-2 rounded-lg border px-3 py-2" onClick={() => download(copy)}>Download signed copy (.txt)</button>
      {copy.storageKey ? <button type="button" className="rounded-lg border px-3 py-2" onClick={() => openOriginal(copy)}>Open original file</button> : null}
    </article>)}</div>
  </section>;
}
