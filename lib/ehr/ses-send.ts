import { createHash, createHmac } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// Shared hand-signed SES v2 REST sender.
//
// The repo deliberately avoids @aws-sdk/client-ses: every outbound email is
// signed with SigV4 by hand and POSTed to the SES v2 outbound-emails endpoint,
// reusing the runtime's own credentials via
// new DynamoDBClient({region}).config.credentials(). This module is the single
// copy of that technique; booking-alert-email.ts, patient-invite-email.ts and
// send-contact-email.ts all call sendSesV2() rather than re-implementing it.
//
// Adds NO new npm dependency.

const SES_REGION = "us-east-1";

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function signingKey(secret: string, date: string, region: string, service: string) {
  const dateKey = createHmac("sha256", `AWS4${secret}`).update(date).digest();
  const regionKey = createHmac("sha256", dateKey).update(region).digest();
  const serviceKey = createHmac("sha256", regionKey).update(service).digest();
  return createHmac("sha256", serviceKey).update("aws4_request").digest();
}

export interface SesSendInput {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  cc?: string[];
  replyTo?: string[];
  // Extra RFC 822 headers (e.g. In-Reply-To / References). When present the
  // message is sent via the SES v2 raw path so the headers survive.
  headers?: Record<string, string>;
}

export interface SesSendResult {
  // "sent" | "not-configured" | the HTTP response (not ok).
  status: string;
  ok: boolean;
  response?: Response;
}

function encodeHeaderValue(value: string): string {
  // RFC 2047 encode only when the value carries non-ASCII characters.
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function buildRawMessage(input: SesSendInput): string {
  const boundary = `rlth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const lines: string[] = [];
  lines.push(`From: ${input.from}`);
  lines.push(`To: ${input.to.join(", ")}`);
  if (input.cc && input.cc.length) lines.push(`Cc: ${input.cc.join(", ")}`);
  if (input.replyTo && input.replyTo.length) lines.push(`Reply-To: ${input.replyTo.join(", ")}`);
  lines.push(`Subject: ${encodeHeaderValue(input.subject)}`);
  lines.push("MIME-Version: 1.0");
  for (const [name, value] of Object.entries(input.headers || {})) {
    lines.push(`${name}: ${value}`);
  }

  if (input.html) {
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(input.text, "utf8").toString("base64"));
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(input.html, "utf8").toString("base64"));
    lines.push(`--${boundary}--`);
  } else {
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(input.text, "utf8").toString("base64"));
  }
  return lines.join("\r\n");
}

function buildPayload(input: SesSendInput): string {
  const destination: { ToAddresses: string[]; CcAddresses?: string[] } = {
    ToAddresses: input.to,
  };
  if (input.cc && input.cc.length) destination.CcAddresses = input.cc;

  // When custom headers are requested (e.g. threading an email reply), use the
  // SES v2 raw path so In-Reply-To/References travel with the message.
  if (input.headers && Object.keys(input.headers).length) {
    return JSON.stringify({
      FromEmailAddress: input.from,
      ReplyToAddresses: input.replyTo && input.replyTo.length ? input.replyTo : undefined,
      Destination: destination,
      Content: {
        Raw: { Data: Buffer.from(buildRawMessage(input), "utf8").toString("base64") },
      },
    });
  }

  const body: Record<string, unknown> = {
    Text: { Data: input.text, Charset: "UTF-8" },
  };
  if (input.html) body.Html = { Data: input.html, Charset: "UTF-8" };

  return JSON.stringify({
    FromEmailAddress: input.from,
    ReplyToAddresses: input.replyTo && input.replyTo.length ? input.replyTo : undefined,
    Destination: destination,
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: "UTF-8" },
        Body: body,
      },
    },
  });
}

/**
 * Signs and POSTs a single SES v2 outbound email using the runtime credentials.
 * Returns { ok, status, response }. Never throws for a non-ok HTTP response —
 * callers decide how to surface SES rejections. Throws only on transport-level
 * failure (so existing callers keep their own try/catch).
 */
export async function sendSesV2(input: SesSendInput): Promise<SesSendResult> {
  const region = SES_REGION;
  const service = "ses";
  const host = `email.${region}.amazonaws.com`;

  // Reuse the runtime's AWS credentials (same source the rest of the app uses).
  const credentials = await new DynamoDBClient({ region }).config.credentials();
  if (!credentials?.accessKeyId) return { status: "not-configured", ok: false };

  const payload = buildPayload(input);

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

  return { status: response.ok ? "sent" : `http-${response.status}`, ok: response.ok, response };
}
