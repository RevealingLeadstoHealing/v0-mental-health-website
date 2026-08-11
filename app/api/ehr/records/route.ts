import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { appendAuditEvent, getClinicalRecord, listClinicalRecords, putClinicalRecord } from "../../../../lib/ehr/dynamodb-store";
import { requireClientAccess } from "../../../../lib/ehr/authorization";
import { mergeClientModuleValue, recordsVisibleToClient } from "../../../../lib/ehr/client-record-policy";

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") || actor.sub;
    const limit = Number(url.searchParams.get("limit") || "50");

    requireRole(actor, ["owner", "provider", "clinical_staff", "client", "auditor"]);
    await requireClientAccess(actor, clientId);

    const chartRecords = await listClinicalRecords(actor.practiceId, clientId, limit);
    const records = actor.role === "client" ? recordsVisibleToClient(chartRecords) : chartRecords;
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
    const body = await request.json();
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const recordType = typeof body.recordType === "string" ? body.recordType : "clinical-note";
    let payload = body.payload && typeof body.payload === "object" ? body.payload : null;

    if (!clientId) {
      throw new ApiError(400, "clientId is required.");
    }

    if (!payload) {
      throw new ApiError(400, "payload is required.");
    }

    await requireClientAccess(actor, clientId);

    const moduleKey = recordType === "ehr-module-snapshot" && typeof payload.moduleKey === "string"
      ? payload.moduleKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)
      : "";
    if (recordType === "ehr-module-snapshot" && !moduleKey) {
      throw new ApiError(400, "A valid moduleKey is required for an EHR module snapshot.");
    }

    if (actor.role === "client") {
      if (recordType !== "ehr-module-snapshot") throw new ApiError(403, "Client accounts may use only authorized portal actions.");
      const existing = await getClinicalRecord(actor.practiceId, clientId, recordType, `module_${moduleKey}`);
      const mergedValue = mergeClientModuleValue(moduleKey, existing?.payload?.value, payload.value, actor, clientId);
      if (!mergedValue) throw new ApiError(403, "This client portal action is not authorized.");
      payload = { moduleKey, value: mergedValue, providerReviewRequired: true };
    } else {
      requireRole(actor, ["owner", "provider", "clinical_staff"]);
    }

    const record = await putClinicalRecord(actor, {
      clientId,
      recordType,
      recordId: moduleKey ? `module_${moduleKey}` : undefined,
      payload,
      status: typeof body.status === "string" ? body.status : "draft",
    });

    await appendAuditEvent(actor, {
      action: "Created clinical record",
      category: "Clinical Documentation",
      clientId,
      entityType: recordType,
      entityId: record.recordId,
      summary: moduleKey ? `${moduleKey} was saved to the encrypted client chart.` : "A clinical record was created through the production API.",
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
