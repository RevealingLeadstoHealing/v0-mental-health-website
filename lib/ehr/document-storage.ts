export function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export const ALLOWED_DOCUMENT_TYPES = [
  "consent",
  "assessment",
  "insurance",
  "clinical",
  "billing",
  "other",
] as const;

export type AllowedDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

export function normalizeDocumentType(value: unknown): AllowedDocumentType {
  const raw = typeof value === "string" ? value : "";
  if ((ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(raw)) return raw as AllowedDocumentType;
  if (/^(insurance|photo-id)/i.test(raw)) return "insurance";
  return "other";
}

// Amplify Hosting compute rejects request bodies above roughly 4.3 MB, so the
// server-side upload path accepts files up to this size (multipart overhead included).
export const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024;

export function newDocumentId() {
  return `document_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function documentStorageKey(
  practiceId: string,
  clientId: string,
  documentType: AllowedDocumentType,
  documentId: string,
  fileName: string
) {
  return [
    "ehr-documents",
    practiceId,
    `client-${safeSegment(clientId)}`,
    safeSegment(documentType),
    `${documentId}-${safeSegment(fileName)}`,
  ].join("/");
}
