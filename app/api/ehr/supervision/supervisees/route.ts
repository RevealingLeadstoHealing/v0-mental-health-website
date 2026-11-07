import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../../lib/ehr/auth";
import { appendAuditEvent } from "../../../../../lib/ehr/dynamodb-store";
import { getSupervisee, listSupervisees, putSupervisee } from "../../../../../lib/ehr/supervision-store";
import {
  canAdministerSupervision,
  normalizeEmail,
  type SuperviseeEntry,
  type SuperviseeKind,
} from "../../../../../lib/ehr/supervision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// GET — owner/provider: all supervisees. Any clinical role: their own entry.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff"]);
    const own = await getSupervisee(actor.practiceId, actor.email);
    if (actor.role === "owner" || actor.role === "provider") {
      const supervisees = await listSupervisees(actor.practiceId);
      return NextResponse.json({ supervisees, own }, { headers: noStore });
    }
    return NextResponse.json({ supervisees: [], own }, { headers: noStore });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// POST { action: "save", email, displayName, credential, kind, supervisorName?, supervisorCredential? }
//      { action: "deactivate", email }
// The signed-in owner/provider becomes the supervisor of record.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);
    const own = await getSupervisee(actor.practiceId, actor.email);
    if (!canAdministerSupervision(actor.role, !!own && own.active)) {
      throw new ApiError(403, "Supervisees cannot change supervision assignments.");
    }

    const body = await request.json();
    const email = normalizeEmail(body?.email);
    if (!EMAIL_PATTERN.test(email) || email.length > 200) {
      throw new ApiError(400, "Enter the teammate's sign-in email address.");
    }
    if (email === normalizeEmail(actor.email)) {
      throw new ApiError(400, "You cannot make yourself your own supervisee.");
    }
    const existing = await getSupervisee(actor.practiceId, email);
    const now = new Date().toISOString();

    if (body.action === "deactivate") {
      if (!existing) throw new ApiError(404, "That teammate is not a registered supervisee.");
      await putSupervisee(actor.practiceId, { ...existing, active: false, updatedAt: now, updatedBy: actor.sub });
    } else if (body.action === "save") {
      const kind: SuperviseeKind | "" =
        body.kind === "intern" || body.kind === "supervised_clinician" ? body.kind : "";
      const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 120) : "";
      const credential = typeof body.credential === "string" ? body.credential.trim().slice(0, 40) : "";
      if (!kind) throw new ApiError(400, "kind must be 'intern' or 'supervised_clinician'.");
      if (!displayName) throw new ApiError(400, "A display name is required.");
      if (!credential) throw new ApiError(400, "A credential is required.");
      const supervisorName =
        (typeof body.supervisorName === "string" ? body.supervisorName.trim().slice(0, 120) : "") || actor.name;
      const supervisorCredential =
        (typeof body.supervisorCredential === "string" ? body.supervisorCredential.trim().slice(0, 40) : "") || "LCSW";
      const entry: SuperviseeEntry = {
        email,
        displayName,
        credential,
        kind: kind as SuperviseeKind,
        supervisorSub: actor.sub,
        supervisorEmail: normalizeEmail(actor.email),
        supervisorName,
        supervisorCredential,
        active: true,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
        updatedBy: actor.sub,
      };
      await putSupervisee(actor.practiceId, entry);
    } else {
      throw new ApiError(400, "action must be 'save' or 'deactivate'.");
    }

    await appendAuditEvent(actor, {
      action: "Updated supervisee assignment",
      category: "Access Control",
      entityType: "supervision",
      entityId: "supervisee",
      summary: "A supervisee assignment was changed by the supervisor.",
    });
    const supervisees = await listSupervisees(actor.practiceId);
    return NextResponse.json({ supervisees }, { headers: noStore });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
