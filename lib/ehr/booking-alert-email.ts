import { sendSesV2 } from "./ses-send";

// Sends the new-booking alert to all configured provider inboxes via the AWS
// SES v2 REST API, signed with SigV4 using the runtime's own credentials.
//
// IMPORTANT: this uses hand-signed fetch (see lib/ehr/ses-send.ts) and adds NO
// new npm dependency — so it cannot break the build the way importing
// @aws-sdk/client-ses would.
//
// The rlth.org domain is verified in SES (us-east-1). Real delivery to these
// inboxes requires SES production access (out of sandbox). Until then this is
// best-effort and the in-EHR standing alert remains the guaranteed path.

const FROM_ADDRESS = process.env.EHR_SES_FROM_ADDRESS || "connect@rlth.org";

// Both provider inboxes get every booking alert.
const ALERT_RECIPIENTS = [
  "connect@rlth.org",
  "info@revealing-leads-to-healing-wellness-services.org",
];

export interface BookingAlertEmailInput {
  alertId: string;
  clientName: string;
  date: string;
  time: string;
  format: string;
  purpose: string;
  acknowledgeUrl: string;
}

/**
 * Returns a short status string: "sent", "not-configured", or "email-error".
 * Never throws — booking creation must not fail if email is unavailable.
 */
export async function sendBookingAlertEmail(input: BookingAlertEmailInput): Promise<string> {
  try {
    const subject = `New appointment booked: ${input.clientName || "Client"} — ${input.date} ${input.time}`;
    const textBody = [
      "A new appointment was booked in the RLTH EHR.",
      "",
      `Client: ${input.clientName || "(name not provided)"}`,
      `Date: ${input.date}`,
      `Time: ${input.time}`,
      `Format: ${input.format || "Telehealth"}`,
      `Purpose: ${input.purpose || "Session"}`,
      "",
      "This alert stays active in the EHR until you acknowledge it.",
      `Acknowledge it here: ${input.acknowledgeUrl}`,
      "",
      "— Revealing Leads to Healing EHR",
    ].join("\n");

    const result = await sendSesV2({
      from: FROM_ADDRESS,
      to: ALERT_RECIPIENTS,
      subject,
      text: textBody,
    });

    if (result.status === "not-configured") return "not-configured";
    if (result.ok) return "sent";
    // 4xx here usually means SES is still in sandbox or the identity isn't ready.
    return "email-pending-ses";
  } catch {
    return "email-error";
  }
}
