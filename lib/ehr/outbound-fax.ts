// Pure helpers for sending a fax through Spruce from the EHR. No network or
// AWS calls live here so the rules can be unit tested.

export type FaxSendMode = "off" | "dry-run" | "live";

/** Anything other than an exact "dry-run" or "live" is treated as off. */
export function parseFaxSendMode(value: unknown): FaxSendMode {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "dry-run" || raw === "live") return raw;
  return "off";
}

/**
 * Normalizes a US fax number to E.164 (+1XXXXXXXXXX). Returns "" when the
 * input is not a plausible US number (NANP: area code and exchange start 2-9).
 */
export function normalizeUsFaxNumber(value: unknown): string {
  if (typeof value !== "string") return "";
  if (!/^[\d\s().+-]+$/.test(value.trim())) return "";
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return "";
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return "";
  return `+1${digits}`;
}

/** Last four digits only, safe to store and show. */
export function maskFaxNumber(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  return digits.length >= 4 ? `***-***-${digits.slice(-4)}` : "***";
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

/** Client-generated token that makes one confirmed send unique. */
export function isValidSendToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(value);
}

export function spruceIdempotencyKey(practiceId: string, sendToken: string) {
  return `ehr-fax-${practiceId}-${sendToken}`.slice(0, 255);
}

export const MAX_COVER_NOTE_LENGTH = 500;

export function cleanCoverNote(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, MAX_COVER_NOTE_LENGTH);
}

export function pdfTitle(fileName: string): string {
  const base = (fileName || "document").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 100).trim() || "document";
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}

/** Message body Spruce requires; the default text carries no PHI. */
export function buildFaxMessageText(coverNote: string) {
  const base = "Confidential medical information.";
  return coverNote ? `${base}\n\n${coverNote}` : base;
}

export type FaxSendValidationInput = {
  faxNumber: unknown;
  authorizationConfirmed: unknown;
  sendToken: unknown;
  hasPdf: boolean;
};

/** Returns a list of plain-language problems; empty means valid. */
export function validateFaxSend(input: FaxSendValidationInput): string[] {
  const problems: string[] = [];
  if (!normalizeUsFaxNumber(input.faxNumber)) problems.push("Enter a valid 10-digit US fax number.");
  if (!input.hasPdf) problems.push("Attach a PDF to fax.");
  if (input.authorizationConfirmed !== true) problems.push("Confirm the recipient, document and disclosure authorization before sending.");
  if (!isValidSendToken(input.sendToken)) problems.push("This send request is missing its confirmation token. Reload the page and try again.");
  return problems;
}
