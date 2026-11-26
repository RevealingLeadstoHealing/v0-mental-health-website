import { NextResponse, type NextRequest } from "next/server";
import { sendContactFormEmail } from "../../../lib/site/send-contact-email";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDocumentClient, hasAwsRuntimeCredentials } from "../../../lib/ehr/aws-runtime";
import { rlthAwsFoundation } from "../../../lib/rlth-aws-foundation";
import {
  HONEYPOT_FIELD,
  TURNSTILE_FIELD,
  clientIpFromHeaders,
  isRateLimited,
  turnstileConfigured,
  validateContactForm,
  verifyTurnstileToken,
} from "../../../lib/site/contact-antispam";

// Handles the public Contact page form (a plain HTML POST, no JavaScript
// required). Redirects back to /contact with a status flag the page reads
// to show a thank-you or error notice.
//
// ANTI-SPAM (2026-11-26, P0 fix for AWS SES Case 179496551900783): this
// form previously accepted any POST with non-empty fields, so bots posted
// directly to it and flooded connect@rlth.org — and the EHR
// consultation-alert — with thousands of spam emails, which got SES
// sending paused. Nothing below is sent or logged until the submission
// passes, in order: per-IP rate limiting, the honeypot check, strict
// server-side validation/sanitization, and Cloudflare Turnstile when its
// keys are configured. Rejected submissions never reach SES and never
// create a DynamoDB/EHR alert.
//
// Every consultation request that PASSES those checks also gets logged as
// a standing alert inside the EHR — the same "won't go away until
// acknowledged" alert the provider already sees for new bookings,
// complete with a repeating chime. This is deliberately independent of
// whether the notification email succeeds: email delivery (SES sandbox,
// domain issues, spam filtering) has its own failure modes, and a
// consultation request must never go unnoticed just because an email
// didn't arrive. Best-effort — a DynamoDB hiccup here must never break
// the actual form submission for the person filling it out.
//
// TIMING FIX (2026-11-26): the route used to await the DynamoDB alert
// and then the SES send, with no timeout on either, before returning any
// redirect — so a missing credential or a hung AWS call left the plain
// POST hanging for tens of seconds and the page looked frozen, with no
// success or error shown. Both AWS calls are now bounded to 10 seconds
// (matching the Turnstile timeout), run concurrently so neither blocks
// the other, and the route always returns a redirect promptly. While
// SES is paused (Case 179496551900783), a submission whose EHR alert
// was recorded still returns ?sent=1 even though the email failed, so
// Kay still gets the inquiry in the EHR.
const AWS_CALL_TIMEOUT_MS = 10_000;

/** Race a promise against a timeout; returns null on timeout. Never throws for a timeout. */
async function withTimeout<T>(promise: Promise<T>, ms = AWS_CALL_TIMEOUT_MS): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function recordConsultationAlert({ name, email, phone, message }: { name: string; email: string; phone: string; message: string }): Promise<boolean> {
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
    return true;
  } catch {
    // Never let alert logging block the actual contact-form submission.
    return false;
  }
}

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const error = () => NextResponse.redirect(new URL("/contact?error=1", origin), { status: 303 });

  // 1. Per-IP rate limiting: max 5 submissions/hour per IP (in-memory,
  // per server instance — see lib/site/contact-antispam.ts).
  if (isRateLimited(clientIpFromHeaders(request.headers))) {
    return error();
  }

  let name = "";
  let email = "";
  let phone = "";
  let message = "";
  let honeypot = "";
  let turnstileToken = "";
  let wantsCopy = false;

  try {
    const form = await request.formData();
    name = String(form.get("name") || "");
    email = String(form.get("email") || "");
    phone = String(form.get("phone") || "");
    message = String(form.get("message") || "");
    honeypot = String(form.get(HONEYPOT_FIELD) || "");
    turnstileToken = String(form.get(TURNSTILE_FIELD) || "");
    wantsCopy = form.get("copy") === "1";
  } catch {
    return error();
  }

  // 2. Honeypot: a filled hidden field means a bot. Pretend success so
  // bots cannot learn they were caught — and send/log nothing.
  const validation = validateContactForm({ name, email, phone, message, honeypot });
  if (validation.errors.includes("honeypot")) {
    return NextResponse.redirect(new URL("/contact?sent=1", origin), { status: 303 });
  }

  // 3. Strict server-side validation + sanitization (email format, field
  // lengths, HTML/control characters stripped). Never trust the browser.
  if (!validation.ok) {
    return error();
  }
  const clean = validation.sanitized;

  // 4. Cloudflare Turnstile, fail-closed ONLY when keys are configured.
  // Until NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY are set
  // in Cloudflare + Amplify, layers 1-3 above are the active protection.
  if (turnstileConfigured()) {
    const human = await verifyTurnstileToken(turnstileToken);
    if (!human) {
      return error();
    }
  }

  // 5. No AWS runtime credentials at all: fail fast instead of hanging
  // on DynamoDB/SES calls that can never succeed. Skip both AWS calls.
  if (!hasAwsRuntimeCredentials()) {
    return error();
  }

  // Only now — after every check has passed — log the standing in-EHR
  // alert and send the email, using the sanitized values. Both run
  // concurrently, each bounded to 10 seconds, so a hung DynamoDB or SES
  // call cannot leave the form hanging with no response.
  const [emailResult, alertRecorded] = await Promise.all([
    withTimeout(sendContactFormEmail({ ...clean, wantsCopy })),
    withTimeout(recordConsultationAlert(clean)),
  ]);

  if (emailResult === "sent") {
    return NextResponse.redirect(new URL("/contact?sent=1", origin), { status: 303 });
  }

  // SES is paused in us-east-1 (Case 179496551900783), so the email can
  // fail even for a genuine inquiry. If the EHR alert was recorded, the
  // inquiry is not lost — show success and log the email failure.
  if (alertRecorded) {
    console.error("Contact form email failed; inquiry recorded in EHR alert", emailResult);
    return NextResponse.redirect(new URL("/contact?sent=1", origin), { status: 303 });
  }

  // "not-configured" (no AWS runtime credentials, e.g. local dev) or
  // "email-pending-ses" / "email-error" (SES not yet out of sandbox, etc.)
  // with no EHR alert recorded either.
  return error();
}
