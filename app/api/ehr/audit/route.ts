import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { appendAuditEvent, listAuditEvents } from "../../../../lib/ehr/dynamodb-store";

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "auditor"]);

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const events = await listAuditEvents(actor.practiceId, limit);

    await appendAuditEvent(actor, {
      action: "Viewed audit log",
      category: "Audit",
      entityType: "audit-log",
      summary: "Audit log was accessed through the production API.",
    });

    return NextResponse.json({ events });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff", "billing_staff", "client"]);
    const body = await request.json();
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "General";
    if (!action) throw new ApiError(400, "Audit action is required.");
    const event = await appendAuditEvent(actor, {
      action: action.slice(0, 200),
      category: category.slice(0, 100),
      clientId: typeof body.clientId === "string" ? body.clientId.slice(0, 200) : "",
      entityType: typeof body.entityType === "string" ? body.entityType.slice(0, 100) : "ehr-action",
      entityId: typeof body.entityId === "string" ? body.entityId.slice(0, 200) : "",
      summary: typeof body.summary === "string" ? body.summary.slice(0, 1000) : "",
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
