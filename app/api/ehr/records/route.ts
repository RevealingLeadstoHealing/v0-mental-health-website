import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { appendAuditEvent, listClientChartRecords, putClinicalRecord, putLatestModuleSnapshot, getClientProfile } from "../../../../lib/ehr/dynamodb-store";
import { MODULE_SNAPSHOT_TYPE, isValidModuleKey } from "../../../../lib/ehr/module-snapshots";
import { getSupervisee, listSupervisedNotes } from "../../../../lib/ehr/supervision-store";
import { findIllegalFinalization, reconcileSupervisedNotes } from "../../../../lib/ehr/supervision";

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") || actor.sub;
    const limit = Number(url.searchParams.get("limit") || "50");

    if (actor.role === "client") {
      // Clients may only access their own chart. Compare against cognitoUserId
      // on the profile (the DynamoDB clientId UUID ≠ the Cognito sub).
      const profile = await getClientProfile(actor.practiceId, clientId);
      if (!profile || profile.cognitoUserId !== actor.sub) {
        throw new ApiError(403, "Clients can only access their own record list.");
      }
    } else {
      requireRole(actor, ["owner", "provider", "clinical_staff", "auditor"]);
    }

    const records = await listClientChartRecords(clientId, limit);
    await appendAuditEvent(actor, {
      action: "Viewed clinical record list",
      category: "Clinical Record Access",
      clientId,
      entityType: "clinical-record-list",
      summary: "Clinical record list was accessed through the production API.",
    });

    return NextResponse.json({ records });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff"]);

    const body = await request.json();
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const recordType = typeof body.recordType === "string" ? body.recordType : "clinical-note";
    const payload = body.payload && typeof body.payload === "object" ? body.payload : null;

    if (!clientId) {
      throw new ApiError(400, "clientId is required.");
    }

    if (!payload) {
      throw new ApiError(400, "payload is required.");
    }

    if (recordType === MODULE_SNAPSHOT_TYPE && !isValidModuleKey(payload.moduleKey)) {
      throw new ApiError(400, "A valid payload.moduleKey is required for module snapshots.");
    }

    const status = typeof body.status === "string" ? body.status : "draft";

    // Supervision guard. The server's supervised-note records are the source of truth for
    // supervisee notes: a supervisee cannot finalize or sign by writing a chart snapshot,
    // and a stale snapshot cannot overwrite a note the supervisor has signed.
    // Non-owners fail closed on lookup errors; the owner's own notes are never blocked.
    let writePayload = payload;
    const isNotesSnapshot =
      recordType === MODULE_SNAPSHOT_TYPE && payload.moduleKey === "notes" && Array.isArray(payload.value);
    if (isNotesSnapshot || recordType === "clinical-note") {
      const guard = async () => {
        const supervisee = await getSupervisee(actor.practiceId, actor.email);
        const activeSupervisee = supervisee && supervisee.active ? supervisee : null;
        if (recordType === "clinical-note") {
          if (activeSupervisee && status !== "draft") {
            throw new ApiError(403, "Supervisee notes are finalized only through supervisor review.");
          }
          return payload;
        }
        const supervised = await listSupervisedNotes(actor.practiceId, { clientId });
        if (activeSupervisee) {
          const illegal = findIllegalFinalization(payload.value, supervised, actor.email);
          if (illegal.length) {
            throw new ApiError(403, "Supervisee notes are finalized only through supervisor review.");
          }
        }
        if (supervised.length === 0 && !activeSupervisee) return payload;
        return {
          ...payload,
          value: reconcileSupervisedNotes(
            payload.value,
            supervised,
            activeSupervisee ? { email: actor.email, kind: activeSupervisee.kind } : null
          ),
        };
      };
      if (actor.role === "owner") {
        try {
          writePayload = await guard();
        } catch (error) {
          if (error instanceof ApiError) throw error;
          writePayload = payload;
        }
      } else {
        writePayload = await guard();
      }
    }

    const record = await putClinicalRecord(actor, {
      clientId,
      recordType,
      recordId: typeof body.recordId === "string" ? body.recordId : undefined,
      payload: writePayload,
      status,
    });
    if (recordType === MODULE_SNAPSHOT_TYPE && !body.recordId) {
      await putLatestModuleSnapshot(actor, clientId, writePayload, status);
    }

    await appendAuditEvent(actor, {
      action: body.recordId ? "Updated clinical record" : "Created clinical record",
      category: "Clinical Documentation",
      clientId,
      entityType: recordType,
      entityId: record.recordId,
      summary: body.recordId
        ? "A clinical record was updated through the production API."
        : "A clinical record was created through the production API.",
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
