// Supervisor review / co-sign model for supervisee clinical notes.
//
// Two kinds of supervisee:
//   intern                BSW/MSW student. Writes the note, NEVER signs. The supervisor
//                         reviews it and signs as the ONLY signer.
//   supervised_clinician  Licensed LMSW. Signs their own note; the supervisor co-signs
//                         and both signatures are shown.
//
// Statuses: pending -> (cosign) -> finalized, pending -> (return) -> returned,
// returned -> (submit) -> pending. A note that was never submitted has no record.
// Finalized is terminal. Billing stays blocked until the supervisor signs.
//
// Pure module (no AWS imports) so it can be unit tested with node --test.
import { providerIdentifiersForName, providerSignatureText } from "./provider-signature.ts";

export type SuperviseeKind = "intern" | "supervised_clinician";
export type SupervisionStatus = "pending" | "returned" | "finalized";
export type SupervisionAction = "submit" | "cosign" | "return";

export interface SuperviseeEntry {
  email: string;
  displayName: string;
  credential: string;
  kind: SuperviseeKind;
  supervisorSub: string;
  supervisorEmail: string;
  supervisorName: string;
  supervisorCredential: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SupervisedNoteContent {
  title: string;
  noteType: string;
  modality: string;
  body: string;
  mseText: string;
  mse: Record<string, unknown>;
  sessionMinutes: string;
  codeDraft: Record<string, string>;
}

export interface SupervisionSignature {
  provider: string;
  credential: string;
  providerNpi: string;
  providerLicense: string;
  signedAt: string;
}

export interface SupervisionHistoryEntry {
  event: "submitted" | "returned" | "cosigned";
  version: number;
  at: string;
  byName: string;
  byRole: string;
  comment?: string;
  snapshot?: SupervisedNoteContent;
}

export interface SupervisedNoteRecord {
  noteId: string;
  clientId: string;
  superviseeEmail: string;
  superviseeName: string;
  superviseeCredential: string;
  kind: SuperviseeKind;
  supervisorSub: string;
  supervisorEmail: string;
  supervisorName: string;
  supervisorCredential: string;
  status: SupervisionStatus;
  version: number;
  dateOfService: string;
  appointmentId: string;
  note: SupervisedNoteContent;
  superviseeSignature?: SupervisionSignature;
  finalSignature?: SupervisionSignature;
  returnComment?: string;
  submittedAt: string;
  finalizedAt?: string;
  history: SupervisionHistoryEntry[];
  revision: number;
}

export const MAX_NOTE_BODY_CHARS = 100000;
export const MAX_RETURN_COMMENT_CHARS = 1000;

export function normalizeEmail(email: unknown): string {
  return String(email || "").trim().toLowerCase();
}

export function supervisionStatusLabel(kind: SuperviseeKind, status: SupervisionStatus): string {
  if (status === "finalized") return "Final";
  if (status === "returned") return "Returned for revision";
  return kind === "intern" ? "Pending supervisor review" : "Pending supervisor co-sign";
}

/**
 * Next status for an action, or throws when the transition is illegal.
 * `current` is null for a note that has never been submitted.
 */
export function nextSupervisionStatus(
  current: SupervisionStatus | null,
  action: SupervisionAction
): SupervisionStatus {
  if (action === "submit") {
    if (current === null || current === "returned") return "pending";
    throw new Error(`A note that is ${current} cannot be submitted for supervisor review.`);
  }
  if (current !== "pending") {
    throw new Error("Only a note that is pending supervisor review can be signed or returned.");
  }
  return action === "cosign" ? "finalized" : "returned";
}

export function requireReturnComment(comment: unknown): string {
  const text = typeof comment === "string" ? comment.trim() : "";
  if (!text) throw new Error("A comment is required when returning a note for revision.");
  if (text.length > MAX_RETURN_COMMENT_CHARS) {
    throw new Error(`The comment must be ${MAX_RETURN_COMMENT_CHARS} characters or fewer.`);
  }
  return text;
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Bounds and shapes untrusted note content coming from the browser. */
export function sanitizeSupervisedContent(raw: unknown): SupervisedNoteContent {
  const source: Record<string, unknown> =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const codeSource: Record<string, unknown> =
    source.codeDraft && typeof source.codeDraft === "object"
      ? (source.codeDraft as Record<string, unknown>)
      : {};
  const codeDraft: Record<string, string> = {};
  for (const key of Object.keys(codeSource).slice(0, 40)) {
    const value = codeSource[key];
    if (typeof value === "string" || typeof value === "number") {
      codeDraft[key.slice(0, 60)] = String(value).slice(0, 500);
    }
  }
  let mse: Record<string, unknown> = {};
  if (source.mse && typeof source.mse === "object" && !Array.isArray(source.mse)) {
    const serialized = JSON.stringify(source.mse);
    if (serialized.length <= 20000) mse = JSON.parse(serialized) as Record<string, unknown>;
  }
  return {
    title: str(source.title, 300),
    noteType: str(source.noteType, 100),
    modality: str(source.modality, 100),
    body: str(source.body, MAX_NOTE_BODY_CHARS),
    mseText: str(source.mseText, 20000),
    mse,
    sessionMinutes: str(String(source.sessionMinutes ?? ""), 10),
    codeDraft,
  };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): boolean {
  return typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Required-field gate for a supervisee submission. Mirrors the owner's save() gate
 * (chief complaint, session time, primary diagnosis, billing code) plus a title,
 * note text and date of service.
 */
export function validateSupervisedSubmission(
  kind: SuperviseeKind,
  input: { content: SupervisedNoteContent; dateOfService: string; signatureName?: string },
  superviseeDisplayName: string
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const { content } = input;
  const code = content.codeDraft || {};
  if (!content.title.trim()) missing.push("note title");
  if (!content.body.trim()) missing.push("note text");
  if (!isIsoDate(input.dateOfService)) missing.push("date of service");
  if (!String(code.chiefComplaint || "").trim()) missing.push("chief complaint / reason for visit");
  if (!(Number(content.sessionMinutes) > 0)) missing.push("session time");
  if (!String(code.primaryDiagnosis || "").trim()) missing.push("primary ICD diagnosis");
  if (!String(code.serviceCode || "").trim()) missing.push("billing CPT/HCPCS code");
  const typed = String(input.signatureName || "").trim();
  if (kind === "intern") {
    if (typed || String(code.providerSignature || "").trim()) missing.push("Interns do not sign (remove the signature)");
  } else if (normalizeEmail(typed) !== normalizeEmail(superviseeDisplayName) || !typed) {
    missing.push("your typed signature (must match your name on file)");
  }
  return { ok: missing.length === 0, missing };
}

type SupervisionTarget = { supervisorSub: string; supervisorEmail: string; superviseeEmail: string };

/** Owner, or the assigned supervisor; never the note's own author. */
export function canSupervise(
  actor: { role: string; sub: string; email: string },
  target: SupervisionTarget
): boolean {
  if (normalizeEmail(actor.email) === normalizeEmail(target.superviseeEmail)) return false;
  if (actor.role === "owner") return true;
  if (actor.role !== "provider") return false;
  return (
    (!!actor.sub && actor.sub === target.supervisorSub) ||
    (!!actor.email && normalizeEmail(actor.email) === normalizeEmail(target.supervisorEmail))
  );
}

/** Only the practice owner (who is not a registered supervisee) may assign supervisees. */
export function canAdministerSupervision(role: string, isRegisteredSupervisee: boolean): boolean {
  return role === "owner" && !isRegisteredSupervisee;
}

/** Credential shown for the supervisor of record; the supervisor is always the authenticated owner. */
export const SUPERVISOR_CREDENTIAL = "LCSW";

/**
 * Returns a reason when `email` may not be registered as a supervisee: the owner themselves,
 * or anyone who is already the supervisor of record for another supervisee.
 */
export function superviseeTargetProblem(
  email: string,
  actorEmail: string,
  entries: Array<{ supervisorEmail: string }>
): string {
  const target = normalizeEmail(email);
  if (!target) return "Enter the teammate's sign-in email address.";
  if (target === normalizeEmail(actorEmail)) return "The practice owner cannot be registered as a supervisee.";
  if ((entries || []).some((entry) => normalizeEmail(entry.supervisorEmail) === target)) {
    return "A supervisor cannot be registered as a supervisee.";
  }
  return "";
}

export function formatSupervisionTimestamp(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", { timeZone: "America/New_York" });
}

/** Builds the supervisor's signature using the existing provider identifier lookup. */
export function buildSupervisionSignature(
  name: string,
  credential: string,
  signedAtIso: string
): SupervisionSignature {
  const identifiers = providerIdentifiersForName(name);
  return {
    provider: name,
    credential,
    providerNpi: identifiers.npi,
    providerLicense: identifiers.licenseNumber,
    signedAt: signedAtIso,
  };
}

/** Display lines for the attribution of a supervised note. */
export function supervisionAttribution(record: SupervisedNoteRecord): string[] {
  const supervisor = `${record.supervisorName}${record.supervisorCredential ? `, ${record.supervisorCredential}` : ""}`;
  const author = `${record.superviseeName}${record.superviseeCredential ? `, ${record.superviseeCredential}` : ""}`;
  if (record.status !== "finalized") {
    return [
      record.status === "returned"
        ? `Returned to ${record.superviseeName} for revision by ${supervisor}`
        : `Drafted by ${record.superviseeName}; awaiting review by ${supervisor}`,
    ];
  }
  const when = formatSupervisionTimestamp(record.finalizedAt);
  if (record.kind === "intern") {
    return [`Drafted by ${record.superviseeName}, reviewed and signed by ${supervisor}`, when];
  }
  return [
    `Signed by ${author}`,
    `Reviewed and co-signed by ${supervisor}`,
    when,
  ].filter(Boolean);
}

/** Reproduces the metadata layout the owner's save() writes, with attribution in place of the signature line. */
export function composeNoteContent(record: SupervisedNoteRecord, signatureLines: string[]): string {
  const code = record.note.codeDraft || {};
  const metadata = [
    `Chief complaint / reason for visit: ${code.chiefComplaint || "Not entered"}`,
    `Onset / duration: ${code.onset || "Not entered"}`,
    `Session minutes: ${record.note.sessionMinutes || "Not entered"}`,
    `Primary ICD-10-CM: ${code.primaryDiagnosis || "Not selected"}`,
    `Secondary ICD-10-CM: ${code.secondaryDiagnosis || "Not selected"}`,
    `Tertiary ICD-10-CM: ${code.tertiaryDiagnosis || "Not selected"}`,
    `Fourth ICD-10-CM: ${code.fourthDiagnosis || "Not selected"}`,
    `Service / CPT-HCPCS: ${code.serviceCode || "Not selected"}`,
    `Interpreter service code: ${code.interpreterCode || "Not used"}`,
    ...signatureLines.map((line, index) => `${index === 0 ? "Provider e-signature" : "Signature detail"}: ${line}`),
    `Client e-signature: ${code.clientSignature || "Not signed / not required"}`,
  ].join("\n");
  return `${metadata}\n\nClinical Note:\n${record.note.body}${record.note.mseText ? `\n\n${record.note.mseText}` : ""}`;
}

function sameDay(a: string | undefined, b: string | undefined): boolean {
  return !!a && !!b && String(a).slice(0, 10) === String(b).slice(0, 10);
}

export interface ClaimSupervisionState {
  required: boolean;
  cosignedAt?: string;
  noteIds: string[];
}

type ClaimLike = {
  clientId?: string;
  appointmentId?: string;
  dateOfService?: string;
  supervisorCosignRequired?: boolean;
  supervisorCosignedAt?: string;
  supervisedNoteId?: string;
};

/**
 * Finds supervised notes that cover a claim (same client, and the same appointment or
 * the same date of service). The claim is blocked until every such note is finalized.
 */
export function claimSupervisionState(
  claim: ClaimLike,
  records: SupervisedNoteRecord[]
): ClaimSupervisionState {
  const forClient = (records || []).filter((record) => record.clientId === claim.clientId);
  // Fail closed: the date and appointment on a note are supervisee-supplied, so any note
  // for this client that the supervisor has not signed yet blocks the client's claims.
  const openNotes = forClient.filter((record) => record.status !== "finalized");
  if (openNotes.length > 0) return { required: true, noteIds: openNotes.map((record) => record.noteId) };
  const matches = forClient.filter(
    (record) =>
      (!!claim.appointmentId && !!record.appointmentId && claim.appointmentId === record.appointmentId) ||
      sameDay(claim.dateOfService, record.dateOfService)
  );
  if (matches.length === 0) return { required: false, noteIds: [] };
  const noteIds = matches.map((record) => record.noteId);
  const latest = matches
    .map((record) => record.finalizedAt || "")
    .sort()
    .pop();
  return { required: true, cosignedAt: latest || undefined, noteIds };
}

/** Overlay: returns the claim with server-derived co-sign fields. Untouched when nothing matches. */
export function withSupervisionStatus<T extends ClaimLike>(claim: T, records: SupervisedNoteRecord[]): T {
  const state = claimSupervisionState(claim, records);
  if (!state.required) return claim;
  const next = {
    ...claim,
    supervisorCosignRequired: true,
    supervisedNoteId: state.noteIds[0],
    supervisorCosignedAt: state.cosignedAt || "",
  };
  return next as T;
}

type LooseNote = Record<string, any>;

/** The note object the chart snapshot should hold for a server record. */
export function supervisedNoteView(record: SupervisedNoteRecord): LooseNote {
  const finalized = record.status === "finalized";
  const attribution = supervisionAttribution(record);
  const codeDraft: Record<string, string> = { ...record.note.codeDraft };
  codeDraft.providerSignature =
    finalized
      ? record.finalSignature?.provider || ""
      : record.kind === "intern"
        ? ""
        : record.superviseeName;
  const view: LooseNote = {
    id: record.noteId,
    title: record.note.title,
    noteType: record.note.noteType,
    modality: record.note.modality,
    content: composeNoteContent(record, finalized ? attribution : [attribution[0]]),
    draftBody: record.note.body,
    mse: record.note.mse,
    sessionMinutes: record.note.sessionMinutes,
    codeDraft,
    dateOfService: record.dateOfService,
    appointmentId: record.appointmentId,
    authorEmail: record.superviseeEmail,
    status: supervisionStatusLabel(record.kind, record.status),
    createdAt: record.submittedAt,
    signature: null,
    supervision: {
      status: record.status,
      kind: record.kind,
      superviseeName: record.superviseeName,
      superviseeCredential: record.superviseeCredential,
      supervisorName: record.supervisorName,
      supervisorCredential: record.supervisorCredential,
      returnComment: record.returnComment || "",
      submittedAt: record.submittedAt,
      finalizedAt: record.finalizedAt || "",
      attribution,
    },
  };
  if (finalized && record.finalSignature) {
    view.signature = {
      provider: record.finalSignature.provider,
      providerNpi: record.finalSignature.providerNpi,
      providerLicense: record.finalSignature.providerLicense,
      client: record.note.codeDraft?.clientSignature || "",
      signedAt: formatSupervisionTimestamp(record.finalSignature.signedAt),
      signatureText: providerSignatureText(
        record.finalSignature.provider,
        record.finalSignature.providerNpi,
        record.finalSignature.providerLicense
      ),
    };
    if (record.superviseeSignature) view.superviseeSignature = record.superviseeSignature;
  }
  return view;
}

/**
 * Forces the chart's notes snapshot to agree with the server's supervised records.
 * Finalized and pending notes always take the server's view. A returned note keeps the
 * supervisee's in-progress edits but its status/supervision block is forced and any
 * signature is dropped. Supervisee-authored notes with no record cannot carry a signature.
 * Never mutates its inputs.
 */
export function reconcileSupervisedNotes(
  incoming: unknown[],
  records: SupervisedNoteRecord[],
  writer?: { email: string; kind: SuperviseeKind } | null
): LooseNote[] {
  const byId = new Map<string, SupervisedNoteRecord>();
  for (const record of records || []) byId.set(record.noteId, record);
  const seen = new Set<string>();
  const result: LooseNote[] = [];
  for (const raw of Array.isArray(incoming) ? incoming : []) {
    const note: LooseNote = raw && typeof raw === "object" ? (raw as LooseNote) : {};
    const record = byId.get(String(note.id || ""));
    if (record) {
      seen.add(record.noteId);
      const view = supervisedNoteView(record);
      if (record.status === "returned") {
        result.push({ ...note, status: view.status, signature: null, supervision: view.supervision, authorEmail: record.superviseeEmail });
      } else {
        result.push(view);
      }
      continue;
    }
    if (writer && normalizeEmail(note.authorEmail) === normalizeEmail(writer.email)) {
      result.push({ ...note, signature: null, status: "Draft - not submitted" });
      continue;
    }
    result.push(note);
  }
  for (const record of records || []) {
    if (!seen.has(record.noteId)) result.unshift(supervisedNoteView(record));
  }
  return result;
}

function isSignedOrFinalNote(note: LooseNote): boolean {
  const signed = Boolean(note.signature && String(note.signature.provider || "").trim());
  const final = /^(final|signed)/i.test(String(note.status || ""));
  return signed || final;
}

function sameSignedNote(a: LooseNote, b: LooseNote): boolean {
  return (
    String(a.id || "") === String(b.id || "") &&
    String(a.status || "") === String(b.status || "") &&
    String(a.content || "") === String(b.content || "") &&
    String(a.signature?.provider || "") === String(b.signature?.provider || "") &&
    String(a.signature?.signedAt || "") === String(b.signature?.signedAt || "")
  );
}

/**
 * Ids of notes in an incoming snapshot, written by a supervisee, that are signed/final
 * but are neither a finalized supervised record nor unchanged from the stored snapshot.
 * Deliberately ignores the client-supplied `authorEmail`, so omitting or changing it
 * cannot hide a forged signature. `storedNotes` is the notes snapshot already on file
 * (the owner's existing signed notes stay legal only while unchanged).
 * `_writerEmail` is kept for call-site compatibility and is not used to filter.
 */
export function findIllegalFinalization(
  incoming: unknown[],
  records: SupervisedNoteRecord[],
  _writerEmail?: string,
  storedNotes: unknown[] = []
): string[] {
  const finalIds = new Set(
    (records || []).filter((record) => record.status === "finalized").map((record) => record.noteId)
  );
  const stored = new Map<string, LooseNote>();
  for (const raw of Array.isArray(storedNotes) ? storedNotes : []) {
    const item: LooseNote = raw && typeof raw === "object" ? (raw as LooseNote) : {};
    if (isSignedOrFinalNote(item)) stored.set(String(item.id || ""), item);
  }
  const ids: string[] = [];
  for (const raw of Array.isArray(incoming) ? incoming : []) {
    const note: LooseNote = raw && typeof raw === "object" ? (raw as LooseNote) : {};
    const id = String(note.id || "");
    if (finalIds.has(id)) continue;
    if (!isSignedOrFinalNote(note)) continue;
    const existing = stored.get(id);
    if (existing && sameSignedNote(existing, note)) continue;
    ids.push(id);
  }
  return ids;
}
