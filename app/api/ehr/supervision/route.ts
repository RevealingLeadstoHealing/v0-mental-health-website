import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { requireClientAccess } from "../../../../lib/ehr/authorization";
import { appendAuditEvent } from "../../../../lib/ehr/dynamodb-store";
import {
  getSupervisedNote,
  getSupervisee,
  listSupervisedNotes,
  putSupervisedNote,
} from "../../../../lib/ehr/supervision-store";
import {
  buildSupervisionSignature,
  canSupervise,
  nextSupervisionStatus,
  normalizeEmail,
  requireReturnComment,
  sanitizeSupervisedContent,
  supervisedNoteView,
  validateSupervisedSubmission,
  type SupervisedNoteRecord,
  type SupervisionAction,
  type SupervisionStatus,
} from "../../../../lib/ehr/supervision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const NOTE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

function transition(current: SupervisionStatus | null, action: SupervisionAction): SupervisionStatus {
  try {
    return nextSupervisionStatus(current, action);
  } catch (error) {
    throw new ApiError(409, error instanceof Error ? error.message : "That action is not allowed for this note.");
  }
}

function namesMatch(typed: unknown, expected: string) {
  const a = String(typed || "").trim().replace(/\s+/g, " ").toLowerCase();
  const b = String(expected || "").trim().replace(/\s+/g, " ").toLowerCase();
  return !!a && a === b;
}

// ---------------------------------------------------------------------------
// GET ?scope=feed  -> the actor's supervisee entry, notes awaiting their review,
//                     and their own pending/returned notes (for the worklist)
// GET ?clientId=   -> supervised-note records for one client chart
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff"]);
    const url = new URL(request.url);

    if (url.searchParams.get("scope") === "feed") {
      const [supervisee, records] = await Promise.all([
        getSupervisee(actor.practiceId, actor.email),
        listSupervisedNotes(actor.practiceId),
      ]);
      const summarize = (record: SupervisedNoteRecord) => ({
        noteId: record.noteId,
        clientId: record.clientId,
        kind: record.kind,
        status: record.status,
        superviseeName: record.superviseeName,
        dateOfService: record.dateOfService,
        returnComment: record.returnComment || "",
        submittedAt: record.submittedAt,
      });
      const queue = records
        .filter((record) => record.status === "pending" && canSupervise(actor, record))
        .map(summarize);
      const me = normalizeEmail(actor.email);
      const mine = records
        .filter((record) => normalizeEmail(record.superviseeEmail) === me && record.status !== "finalized")
        .map(summarize);
      return NextResponse.json({ supervisee, queue, mine }, { headers: noStore });
    }

    const clientId = url.searchParams.get("clientId") || "";
    if (!clientId) throw new ApiError(400, "clientId or scope=feed is required.");
    await requireClientAccess(actor, clientId);
    const records = await listSupervisedNotes(actor.practiceId, { clientId });
    return NextResponse.json({ records }, { headers: noStore });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// POST { action: "submit" | "cosign" | "return", clientId, noteId, ... }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff"]);

    const body = await request.json();
    const action = body?.action;
    const clientId = typeof body?.clientId === "string" ? body.clientId : "";
    const noteId = typeof body?.noteId === "string" ? body.noteId : "";
    if (!clientId) throw new ApiError(400, "clientId is required.");
    if (!NOTE_ID_PATTERN.test(noteId)) throw new ApiError(400, "A valid noteId is required.");
    await requireClientAccess(actor, clientId);
    const now = new Date().toISOString();

    if (action === "submit") {
      if (actor.role === "owner") {
        throw new ApiError(403, "The practice owner signs notes directly and does not submit for co-sign.");
      }
      const entry = await getSupervisee(actor.practiceId, actor.email);
      if (!entry || !entry.active) {
        throw new ApiError(403, "Your account is not set up as a supervisee. Ask the practice owner to add you.");
      }
      const content = sanitizeSupervisedContent(body.note);
      const dateOfService = typeof body.dateOfService === "string" ? body.dateOfService.slice(0, 10) : "";
      const gate = validateSupervisedSubmission(
        entry.kind,
        { content, dateOfService, signatureName: typeof body.signatureName === "string" ? body.signatureName : "" },
        entry.displayName
      );
      if (!gate.ok) {
        throw new ApiError(422, `Missing required fields before submitting: ${gate.missing.join(", ")}.`);
      }
      const existing = await getSupervisedNote(actor.practiceId, clientId, noteId);
      if (existing && normalizeEmail(existing.superviseeEmail) !== normalizeEmail(actor.email)) {
        throw new ApiError(409, "This note belongs to another author.");
      }
      const status = transition(existing ? existing.status : null, "submit");
      const version = (existing ? existing.version : 0) + 1;
      const record: SupervisedNoteRecord = {
        noteId,
        clientId,
        superviseeEmail: normalizeEmail(actor.email),
        superviseeName: entry.displayName,
        superviseeCredential: entry.credential,
        kind: entry.kind,
        supervisorSub: entry.supervisorSub,
        supervisorEmail: entry.supervisorEmail,
        supervisorName: entry.supervisorName,
        supervisorCredential: entry.supervisorCredential,
        status,
        version,
        dateOfService,
        appointmentId: typeof body.appointmentId === "string" ? body.appointmentId.slice(0, 100) : "",
        note: content,
        ...(entry.kind === "supervised_clinician"
          ? { superviseeSignature: buildSupervisionSignature(entry.displayName, entry.credential, now) }
          : {}),
        submittedAt: now,
        history: [
          ...(existing ? existing.history : []),
          {
            event: "submitted",
            version,
            at: now,
            byName: entry.displayName,
            byRole: entry.kind === "intern" ? "intern" : "supervised clinician",
            snapshot: content,
          },
        ],
        revision: (existing ? existing.revision : 0) + 1,
      };
      await putSupervisedNote(actor.practiceId, record, { expectedRevision: existing ? existing.revision : null });
      await appendAuditEvent(actor, {
        action: entry.kind === "intern" ? "Submitted note for supervisor review" : "Submitted note for supervisor co-sign",
        category: "Clinical Documentation",
        clientId,
        entityType: "clinical-note",
        entityId: noteId,
        summary: "A supervisee note was submitted for supervisor review. It is not final or billable until the supervisor signs.",
      });
      return NextResponse.json({ record, note: supervisedNoteView(record) }, { status: 201, headers: noStore });
    }

    if (action === "cosign" || action === "return") {
      const existing = await getSupervisedNote(actor.practiceId, clientId, noteId);
      if (!existing) throw new ApiError(404, "Supervised note was not found.");
      if (!canSupervise(actor, existing)) {
        throw new ApiError(403, "Only the assigned supervisor can review this note.");
      }

      if (action === "cosign") {
        const status = transition(existing.status, "cosign");
        if (body.attested !== true) {
          throw new ApiError(400, "Confirm that you reviewed the note before signing.");
        }
        if (!namesMatch(body.signatureName, existing.supervisorName)) {
          throw new ApiError(422, "Type your full name exactly as it appears on file to sign.");
        }
        const record: SupervisedNoteRecord = {
          ...existing,
          status,
          finalSignature: buildSupervisionSignature(existing.supervisorName, existing.supervisorCredential, now),
          finalizedAt: now,
          history: [
            ...existing.history,
            {
              event: "cosigned",
              version: existing.version,
              at: now,
              byName: existing.supervisorName,
              byRole: actor.role,
            },
          ],
          revision: existing.revision + 1,
        };
        await putSupervisedNote(actor.practiceId, record, { expectedRevision: existing.revision });
        await appendAuditEvent(actor, {
          action: existing.kind === "intern" ? "Supervisor signed supervised note" : "Supervisor co-signed note",
          category: "Clinical Documentation",
          clientId,
          entityType: "clinical-note",
          entityId: noteId,
          summary: "A supervised note was reviewed and signed by the supervisor and is now final.",
        });
        return NextResponse.json({ record, note: supervisedNoteView(record) }, { headers: noStore });
      }

      let comment = "";
      try {
        comment = requireReturnComment(body.comment);
      } catch (error) {
        throw new ApiError(400, error instanceof Error ? error.message : "A comment is required.");
      }
      const status = transition(existing.status, "return");
      const record: SupervisedNoteRecord = {
        ...existing,
        status,
        returnComment: comment,
        history: [
          ...existing.history,
          {
            event: "returned",
            version: existing.version,
            at: now,
            byName: existing.supervisorName,
            byRole: actor.role,
            comment,
          },
        ],
        revision: existing.revision + 1,
      };
      await putSupervisedNote(actor.practiceId, record, { expectedRevision: existing.revision });
      await appendAuditEvent(actor, {
        action: "Returned note for revision",
        category: "Clinical Documentation",
        clientId,
        entityType: "clinical-note",
        entityId: noteId,
        summary: "A supervisee note was returned for revision with a supervisor comment.",
      });
      return NextResponse.json({ record, note: supervisedNoteView(record) }, { headers: noStore });
    }

    throw new ApiError(400, "action must be 'submit', 'cosign', or 'return'.");
  } catch (error) {
    return apiErrorResponse(error);
  }
}
