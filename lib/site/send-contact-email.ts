import { sendSesV2 } from "../ehr/ses-send";

// Sends the public website's Contact form submissions via the AWS SES v2
// REST API, signed with SigV4 using the runtime's own credentials.
//
// This reuses the shared hand-signed-fetch sender in lib/ehr/ses-send.ts,
// which is the same technique lib/ehr/booking-alert-email.ts uses. Adds NO new
// npm dependency.
//
// The rlth.org domain is verified in SES (us-east-1). Real delivery requires
// SES production access (out of sandbox) — see docs/aws-production-checklist.md.

const FROM_ADDRESS = process.env.EHR_SES_FROM_ADDRESS || "connect@rlth.org";

// Every contact-form inquiry goes to both practice inboxes, same as
// booking alerts, so nothing depends on a single inbox being checked.
const CONTACT_RECIPIENTS = [
  "connect@rlth.org",
  "info@revealing-leads-to-healing-wellness-services.org",
];

export interface ContactFormInput {
  name: string;
  email: string;
  phone: string;
  message: string;
  wantsCopy: boolean;
}

/**
 * Returns "sent", "not-configured", or "email-error". Never throws.
 */
export async function sendContactFormEmail(input: ContactFormInput): Promise<string> {
  try {
    const subject = `Website contact form: ${input.name || "New inquiry"}`;
    const textBody = [
      "A new message was submitted through the Contact form at",
      "revealing-leads-to-healing-wellness-services.org.",
      "",
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone}`,
      "",
      "Message:",
      input.message,
    ].join("\n");

    const cc = input.wantsCopy && input.email ? [input.email] : undefined;

    const result = await sendSesV2({
      from: FROM_ADDRESS,
      to: CONTACT_RECIPIENTS,
      subject,
      text: textBody,
      cc,
      replyTo: input.email ? [input.email] : undefined,
    });

    if (result.status === "not-configured") return "not-configured";
    if (result.ok) return "sent";
    return "email-pending-ses";
  } catch {
    return "email-error";
  }
}
