import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { appendAuditEvent, listClinicalRecords, putClinicalRecord, getClientProfile } from "../../../../lib/ehr/dynamodb-store";

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
      recordId: typeof body.recordId === "string" ? body.recordId : undefined,
      payload,
      status: typeof body.status === "string" ? body.status : "draft",
    });

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
