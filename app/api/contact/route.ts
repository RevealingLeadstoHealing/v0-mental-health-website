import { NextResponse, type NextRequest } from "next/server";
import { sendContactFormEmail } from "../../../lib/site/send-contact-email";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDocumentClient } from "../../../lib/ehr/aws-runtime";
import { rlthAwsFoundation } from "../../../lib/rlth-aws-foundation";

// Handles the public Contact page form (a plain HTML POST, no JavaScript
// required). Redirects back to /contact with a status flag the page reads
// to show a thank-you or error notice.

// Every consultation request also gets logged as a standing alert inside the
// EHR — the same "won't go away until acknowledged" alert the provider
// already sees for new bookings, complete with a repeating chime. This is
// deliberately independent of whether the notification email succeeds: email
// delivery (SES sandbox, domain issues, spam filtering) has its own failure
// modes, and a consultation request must never go unnoticed just because an
// email didn't arrive. Best-effort — a DynamoDB hiccup here must never break
// the actual form submission for the person filling it out.
async function recordConsultationAlert({ name, email, phone, message }: { name: string; email: string; phone: string; message: string }) {
  try {
    const now = new Date().toISOString();
    const alertId = `consult_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const practiceId = "rlth";
    await getDynamoDocumentClient().send(new PutCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      Item: {
        PK: `PRACTICE#${practiceId}#BOOKING_ALERTS`,
        SK: `ALERT#${now}#${alertId}`,
        recordType: "consultation-alert",
        alertId,
        practiceId,
        clientId: "",
        clientName: name,
        contactEmail: email,
        contactPhone: phone,
        contactMessage: String(message || "").slice(0, 500),
        appointmentDate: "",
        appointmentTime: "",
        appointmentFormat: "",
        appointmentPurpose: "Website consultation request",
        bookedByRole: "public",
        createdAt: now,
        acknowledgedAt: "",
        acknowledgedBy: "",
      },
    }));
  } catch {
    // Never let alert logging block the actual contact-form submission.
  }
}

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;

  let name = "";
  let email = "";
  let phone = "";
  let message = "";
  let wantsCopy = false;

  try {
    const form = await request.formData();
    name = String(form.get("name") || "").trim();
    email = String(form.get("email") || "").trim();
    phone = String(form.get("phone") || "").trim();
    message = String(form.get("message") || "").trim();
    wantsCopy = form.get("copy") === "1";
  } catch {
    return NextResponse.redirect(new URL("/contact?error=1", origin), { status: 303 });
  }

  if (!name || !email || !message || !phone) {
    return NextResponse.redirect(new URL("/contact?error=1", origin), { status: 303 });
  }

  // Log the standing in-EHR alert first, independent of the email outcome
  // below, so the provider always has a record even if the email never
  // arrives.
  await recordConsultationAlert({ name, email, phone, message });

  const result = await sendContactFormEmail({ name, email, phone, message, wantsCopy });

  if (result === "sent") {
    return NextResponse.redirect(new URL("/contact?sent=1", origin), { status: 303 });
  }

  // "not-configured" (no AWS runtime credentials, e.g. local dev) or
  // "email-pending-ses" / "email-error" (SES not yet out of sandbox, etc.)
  return NextResponse.redirect(new URL("/contact?error=1", origin), { status: 303 });
}
