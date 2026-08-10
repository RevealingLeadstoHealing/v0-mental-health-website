import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { appendAuditEvent, listClientProfiles, putClientProfile } from "../../../../lib/ehr/dynamodb-store";

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff", "billing_staff", "client", "auditor"]);
    const clients = await listClientProfiles(actor);
    await appendAuditEvent(actor, {
      action: "Viewed authorized client list",
      category: "Client Access",
      entityType: "client-list",
      summary: `Returned ${clients.length} authorized client profiles.`,
    });
    return NextResponse.json({ clients });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (!fullName) throw new ApiError(400, "Client full name is required.");
    const client = await putClientProfile(actor, {
      fullName,
      preferredName: typeof body.preferredName === "string" ? body.preferredName.trim() : "",
      dateOfBirth: typeof body.dateOfBirth === "string" ? body.dateOfBirth : "",
      email: typeof body.email === "string" ? body.email.trim() : "",
      phone: typeof body.phone === "string" ? body.phone.trim() : "",
      assignedProviderIds: Array.isArray(body.assignedProviderIds)
        ? body.assignedProviderIds.filter((value: unknown): value is string => typeof value === "string")
        : [actor.sub],
    });
    await appendAuditEvent(actor, {
      action: "Created client chart",
      category: "Client Administration",
      clientId: client.clientId,
      entityType: "client-profile",
      entityId: client.clientId,
      summary: "A client chart was created through the production API.",
    });
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
