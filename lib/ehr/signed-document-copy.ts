export function clientDocumentSignature(document: any) {
  const entries = [...(Array.isArray(document?.signatures) ? document.signatures : []), document?.signature];
  return entries.find(entry => entry && (entry.authenticatedRole === 'client' || entry.role === 'Client') && entry.signedAt) || null;
}

// Explicit projection: never include unrelated chart fields in a signed copy.
export function signedDocumentCopy(document: any) {
  const signature = clientDocumentSignature(document);
  if (!signature || !document?.id) return null;
  return {
    documentId: String(document.id), title: String(document.title || 'Signed document'),
    text: String(document.generatedLetterText || document.body || document.content || ''),
    storageKey: String(document.storageKey || ''), fileName: String(document.uploadedFileName || ''),
    signature: { signer: String(signature.signer || ''), signedAt: String(signature.signedAt), role: 'Client' },
  };
}
