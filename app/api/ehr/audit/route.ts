import { NextResponse } from "next/server";
import { apiErrorResponse, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
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
