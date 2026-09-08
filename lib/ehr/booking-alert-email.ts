import { createHash, createHmac } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// Sends the new-booking alert to all configured provider inboxes via the AWS
// SES v2 REST API, signed with SigV4 using the runtime's own credentials.
//
// IMPORTANT: this uses hand-signed fetch (the same technique clients/route.ts
// uses for Cognito) and adds NO new npm dependency — so it cannot break the
// build the way importing @aws-sdk/client-ses would.
//
// The rlth.org domain is verified in SES (us-east-1). Real delivery to these
// inboxes requires SES production access (out of sandbox). Until then this is
// best-effort and the in-EHR standing alert remains the guaranteed path.

const SES_REGION = "us-east-1";
const FROM_ADDRESS = process.env.EHR_SES_FROM_ADDRESS || "connect@rlth.org";

// All three provider inboxes get every booking alert.
const ALERT_RECIPIENTS = [
  "connect@rlth.org",
  "info@revealing-leads-to-healing-wellness-services.org",
  "revealtohealllc@gmail.com",
];

function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function signingKey(secret: string, date: string, region: string, service: string) {
  const dateKey = createHmac("sha256", `AWS4${secret}`).update(date).digest();
  const regionKey = createHmac("sha256", dateKey).update(region).digest();
  const serviceKey = createHmac("sha256", regionKey).update(service).digest();
  return createHmac("sha256", serviceKey).update("aws4_request").digest();
}

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
    const region = SES_REGION;
    const service = "ses";
    const host = `email.${region}.amazonaws.com`;

    // Reuse the runtime's AWS credentials (same source the rest of the app uses).
    const credentials = await new DynamoDBClient({ region }).config.credentials();
    if (!credentials?.accessKeyId) return "not-configured";

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

    // SES v2 SendEmail JSON payload.
    const payload = JSON.stringify({
      FromEmailAddress: FROM_ADDRESS,
      Destination: { ToAddresses: ALERT_RECIPIENTS },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Text: { Data: textBody, Charset: "UTF-8" } },
        },
      },
    });

    const canonicalUri = "/v2/email/outbound-emails";
    const endpoint = `https://${host}${canonicalUri}`;
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = timestamp.slice(0, 8);

    const headers: Record<string, string> = {
      "content-type": "application/json",
      host,
      "x-amz-date": timestamp,
    };
    if (credentials.sessionToken) headers["x-amz-security-token"] = credentials.sessionToken;

    const names = Object.keys(headers).sort();
    const signedHeaders = names.join(";");
    const canonicalHeaders = names.map((name) => `${name}:${headers[name].trim()}\n`).join("");
    const canonicalRequest = [
      "POST",
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      sha256Hex(payload),
    ].join("\n");
    const scope = `${date}/${region}/${service}/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", timestamp, scope, sha256Hex(canonicalRequest)].join("\n");
    const signature = createHmac("sha256", signingKey(credentials.secretAccessKey, date, region, service))
      .update(stringToSign)
      .digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { ...headers, authorization },
      body: payload,
      cache: "no-store",
    });

    if (response.ok) return "sent";
    // 4xx here usually means SES is still in sandbox or the identity isn't ready.
    return "email-pending-ses";
  } catch {
    return "email-error";
  }
}
