import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { appendAuditEvent, listClinicalRecords, putClinicalRecord } from "../../../../lib/ehr/dynamodb-store";

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") || actor.sub;
    const limit = Number(url.searchParams.get("limit") || "50");

    if (actor.role === "client" && clientId !== actor.sub) {
      throw new ApiError(403, "Clients can only access their own record list.");
    }

    if (actor.role !== "client") {
      requireRole(actor, ["owner", "provider", "clinical_staff", "auditor"]);
    }

    const records = await listClinicalRecords(clientId, limit);
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

    const record = await putClinicalRecord(actor, {
      clientId,
      recordType,
      payload,
      status: typeof body.status === "string" ? body.status : "draft",
    });

    await appendAuditEvent(actor, {
      action: "Created clinical record",
      category: "Clinical Documentation",
      clientId,
      entityType: recordType,
      entityId: record.recordId,
      summary: "A clinical record was created through the production API.",
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
