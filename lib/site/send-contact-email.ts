import { createHash, createHmac } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// Sends the public website's Contact form submissions via the AWS SES v2
// REST API, signed with SigV4 using the runtime's own credentials.
//
// This mirrors the same hand-signed-fetch technique used in
// lib/ehr/booking-alert-email.ts, kept as a separate, self-contained copy so
// that changes to the public website's contact form can never affect the
// clinical EHR's own booking-alert email path. Adds NO new npm dependency.
//
// The rlth.org domain is verified in SES (us-east-1). Real delivery requires
// SES production access (out of sandbox) — see docs/aws-production-checklist.md.

const SES_REGION = "us-east-1";
const FROM_ADDRESS = process.env.EHR_SES_FROM_ADDRESS || "connect@rlth.org";

// Every contact-form inquiry goes to all three practice inboxes, same as
// booking alerts, so nothing depends on a single inbox being checked.
const CONTACT_RECIPIENTS = [
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
    const region = SES_REGION;
    const service = "ses";
    const host = `email.${region}.amazonaws.com`;

    const credentials = await new DynamoDBClient({ region }).config.credentials();
    if (!credentials?.accessKeyId) return "not-configured";

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

    const destination: { ToAddresses: string[]; CcAddresses?: string[] } = {
      ToAddresses: CONTACT_RECIPIENTS,
    };
    if (input.wantsCopy && input.email) {
      destination.CcAddresses = [input.email];
    }

    const payload = JSON.stringify({
      FromEmailAddress: FROM_ADDRESS,
      ReplyToAddresses: input.email ? [input.email] : undefined,
      Destination: destination,
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
    return "email-pending-ses";
  } catch {
    return "email-error";
  }
}
