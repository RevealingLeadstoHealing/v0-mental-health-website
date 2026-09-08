import { NextResponse } from "next/server";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { requireClientAccess } from "../../../../lib/ehr/authorization";
import { appendAuditEvent } from "../../../../lib/ehr/dynamodb-store";
import { getDynamoDocumentClient } from "../../../../lib/ehr/aws-runtime";
import { rlthAwsFoundation } from "../../../../lib/rlth-aws-foundation";
import { sendBookingAlertEmail } from "../../../../lib/ehr/booking-alert-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TableName = () => rlthAwsFoundation.clinicalRecordsTableName;

// Booking alerts are stored under the practice so the provider can see every
// new booking in one place:
//   PK = PRACTICE#{practiceId}#BOOKING_ALERTS
//   SK = ALERT#{createdAt}#{alertId}
function alertKeys(practiceId: string, createdAt: string, alertId: string) {
  return {
    PK: `PRACTICE#${practiceId}#BOOKING_ALERTS`,
    SK: `ALERT#${createdAt}#${alertId}`,
  };
}

// ---------------------------------------------------------------------------
// GET — list booking alerts (provider view). ?pending=1 returns only
// alerts that still need acknowledgment.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);

    const url = new URL(request.url);
    const pendingOnly = url.searchParams.get("pending") === "1";

    const dynamo = getDynamoDocumentClient();
    const response = await dynamo.send(
      new QueryCommand({
        TableName: TableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `PRACTICE#${actor.practiceId}#BOOKING_ALERTS`,
          ":prefix": "ALERT#",
        },
        ScanIndexForward: false,
        Limit: 100,
      })
    );

    let alerts = response.Items || [];
    if (pendingOnly) alerts = alerts.filter((a) => a.acknowledgedAt == null || a.acknowledgedAt === "");

    return NextResponse.json({ alerts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// POST — create a booking alert (called when an appointment is booked).
// Records the standing alert and sends the email to all configured inboxes.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    // Any authenticated role can trigger an alert by booking (client self-book
    // or provider booking). The alert itself is only readable by owner/provider.
    requireRole(actor, ["owner", "provider", "client"]);

    const body = await request.json();
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    if (!clientId) throw new ApiError(400, "clientId is required.");
    await requireClientAccess(actor, clientId);

    const now = new Date().toISOString();
    const alertId = `bkalert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const clientName = String(body.clientName || "").slice(0, 200);
    const date = String(body.date || "").slice(0, 10);
    const time = String(body.time || "").slice(0, 10);
    const format = String(body.format || "").slice(0, 40);
    const purpose = String(body.purpose || "").slice(0, 200);
    const bookedByRole = actor.role;

    const item = {
      ...alertKeys(actor.practiceId, now, alertId),
      recordType: "booking-alert",
      alertId,
      practiceId: actor.practiceId,
      clientId,
      clientName,
      appointmentDate: date,
      appointmentTime: time,
      appointmentFormat: format,
      appointmentPurpose: purpose,
      bookedByRole,
      createdAt: now,
      acknowledgedAt: "",
      acknowledgedBy: "",
    };

    const dynamo = getDynamoDocumentClient();
    await dynamo.send(new PutCommand({ TableName: TableName(), Item: item }));

    await appendAuditEvent(actor, {
      action: "New appointment booking alert created",
      category: "Scheduling",
      clientId,
      entityType: "booking-alert",
      entityId: alertId,
      summary: `${clientName || "A client"} booked ${purpose || "an appointment"} on ${date} at ${time}.`,
    });

    // Email the alert to all configured inboxes. This is best-effort: if email
    // is not yet enabled (SES pending), the standing in-EHR alert still stands.
    let emailStatus = "not-sent";
    try {
      emailStatus = await sendBookingAlertEmail({
        alertId,
        clientName,
        date,
        time,
        format,
        purpose,
        acknowledgeUrl: `${new URL(request.url).origin}/ehr/schedule?ack=${encodeURIComponent(alertId)}`,
      });
    } catch {
      emailStatus = "email-error";
    }

    return NextResponse.json({ alert: item, emailStatus }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// PATCH — acknowledge a booking alert. One acknowledgment (from the EHR or
// from an email Acknowledge link) clears the standing alert everywhere.
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);

    const body = await request.json();
    const alertId = typeof body.alertId === "string" ? body.alertId : "";
    const createdAt = typeof body.createdAt === "string" ? body.createdAt : "";
    if (!alertId || !createdAt) throw new ApiError(400, "alertId and createdAt are required.");

    const now = new Date().toISOString();
    const dynamo = getDynamoDocumentClient();
    await dynamo.send(
      new UpdateCommand({
        TableName: TableName(),
        Key: alertKeys(actor.practiceId, createdAt, alertId),
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
        UpdateExpression: "SET acknowledgedAt = :now, acknowledgedBy = :by",
        ExpressionAttributeValues: { ":now": now, ":by": actor.name || actor.sub },
      })
    );

    await appendAuditEvent(actor, {
      action: "Acknowledged appointment booking alert",
      category: "Scheduling",
      entityType: "booking-alert",
      entityId: alertId,
      summary: "A new-booking alert was acknowledged by the provider.",
    });

    return NextResponse.json({ acknowledged: true, alertId, acknowledgedAt: now }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
