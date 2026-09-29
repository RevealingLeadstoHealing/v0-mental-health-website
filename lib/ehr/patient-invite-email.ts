import { createHash, createHmac } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// Sends the patient's portal-invitation email ourselves via the AWS SES v2 REST
// API (same hand-signed-fetch technique as booking-alert-email.ts and the
// Cognito admin calls in clients/route.ts — no new AWS SDK client dependency).
//
// Why this exists: Cognito's own AdminCreateUser "welcome message" only ever
// contains a username and a temporary password with no formatting, branding,
// portal links, or onboarding direction. The practice needs the invite to
// carry: the username/temp password, direct login links for every production
// EHR site, a scannable QR code shortcut, and a pointer to the intake
// package. To get that content we suppress Cognito's own message
// (MessageAction: SUPPRESS, no DesiredDeliveryMediums) and send this instead.
//
// The rlth.org domain is verified in SES (us-east-1). Real delivery requires
// SES production access (out of sandbox); until then this is best-effort —
// callers should not fail patient creation if this returns anything other
// than "sent".

const SES_REGION = "us-east-1";
const FROM_ADDRESS = process.env.EHR_SES_FROM_ADDRESS || "connect@rlth.org";

// Every production origin the patient portal is reachable from. The custom
// domain is listed first and is the one used for the QR code and the primary
// button; the raw Amplify domain is included as a backup link in case the
// custom domain is ever unreachable for a given patient's network/DNS.
const PORTAL_ORIGINS = [
  "https://ehr.revealing-leads-to-healing-wellness-services.org",
  "https://aws-ehr-production.d1mwc7x488m8xn.amplifyapp.com",
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] as string));
}

export interface PatientInviteEmailInput {
  fullName: string;
  email: string;
  temporaryPassword: string;
}

/**
 * Returns a short status string: "sent", "not-configured", or "email-error".
 * Never throws — patient/account creation must not fail if email is unavailable.
 */
export async function sendPatientInviteEmail(input: PatientInviteEmailInput): Promise<string> {
  try {
    const region = SES_REGION;
    const service = "ses";
    const host = `email.${region}.amazonaws.com`;

    const credentials = await new DynamoDBClient({ region }).config.credentials();
    if (!credentials?.accessKeyId) return "not-configured";

    const [primaryOrigin, ...backupOrigins] = PORTAL_ORIGINS;
    const loginUrl = `${primaryOrigin}/login?returnTo=/ehr`;

    let qrCodeDataUrl = "";
    try {
      // Dynamic import + interop-safe access (same pattern used for the MFA-setup
      // QR code in app/login/page.tsx) avoids relying on a particular CJS/ESM
      // export shape for the qrcode package under the Next.js server bundler.
      const qrCodeModule: any = await import("qrcode");
      const toDataURL = qrCodeModule.toDataURL || qrCodeModule.default?.toDataURL;
      if (toDataURL) {
        qrCodeDataUrl = await toDataURL(loginUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 240,
          color: { dark: "#2b2926", light: "#ffffff" },
        });
      }
    } catch {
      qrCodeDataUrl = "";
    }

    const displayName = input.fullName || "there";
    const subject = "Your Revealing Leads to Healing patient portal invitation";

    const textLines = [
      `Hi ${displayName},`,
      "",
      "Your secure patient portal account for Revealing Leads to Healing Wellness Services is ready.",
      "",
      `Username: ${input.email}`,
      `Temporary password: ${input.temporaryPassword}`,
      "",
      "This temporary password works once. Sign in and you'll be asked to set a permanent password and set up two-factor authentication (an authenticator app) right away.",
      "",
      "Sign in here:",
      loginUrl,
      "",
      ...(backupOrigins.length
        ? ["If that link doesn't load, try the backup portal address:", `${backupOrigins[0]}/login?returnTo=/ehr`, ""]
        : []),
      "After you sign in, go to \"Patient Intake & Consents\" to complete your intake package. Please finish it within 5 days of receiving this invitation.",
      "",
      "Questions? Reply to this email at connect@rlth.org.",
      "",
      "— Revealing Leads to Healing Wellness Services, LLC",
    ];
    const textBody = textLines.join("\n");

    const qrImageHtml = qrCodeDataUrl
      ? `<div style="margin:20px 0;text-align:center;"><img src="${qrCodeDataUrl}" alt="Scan to open the patient portal login" width="200" height="200" style="border:1px solid #ddd3c1;border-radius:8px;" /><div style="margin-top:8px;font-size:12px;color:#675f54;">Scan with your phone camera to open the login page</div></div>`
      : "";

    const htmlBody = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ea;font-family:Arial,Helvetica,sans-serif;color:#2b2926;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#796f63;margin:0 0 8px;">Revealing Leads to Healing EHR</p>
      <h1 style="font-size:20px;margin:0 0 16px;">Your patient portal is ready</h1>
      <p style="font-size:15px;line-height:1.5;">Hi ${escapeHtml(displayName)},</p>
      <p style="font-size:15px;line-height:1.5;">Your secure patient portal account for Revealing Leads to Healing Wellness Services is ready. Here's how to sign in:</p>
      <table role="presentation" style="width:100%;margin:16px 0;border:1px solid #ddd3c1;border-radius:8px;background:#fff;">
        <tr><td style="padding:14px 16px;font-size:13px;color:#675f54;">Username</td><td style="padding:14px 16px;font-size:15px;font-family:Consolas,monospace;text-align:right;">${escapeHtml(input.email)}</td></tr>
        <tr><td style="padding:14px 16px;font-size:13px;color:#675f54;border-top:1px solid #ddd3c1;">Temporary password</td><td style="padding:14px 16px;font-size:15px;font-family:Consolas,monospace;text-align:right;border-top:1px solid #ddd3c1;">${escapeHtml(input.temporaryPassword)}</td></tr>
      </table>
      <p style="font-size:13px;line-height:1.5;color:#675f54;">This temporary password works once. After you sign in you'll set a permanent password and set up two-factor authentication (an authenticator app).</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${loginUrl}" style="display:inline-block;padding:12px 22px;background:#2b2926;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Sign in to the patient portal</a>
      </div>
      ${qrImageHtml}
      ${backupOrigins.length ? `<p style="font-size:13px;line-height:1.5;color:#675f54;">If that button doesn't work, try the backup portal address: <a href="${backupOrigins[0]}/login?returnTo=/ehr" style="color:#2b2926;">${escapeHtml(backupOrigins[0])}</a></p>` : ""}
      <p style="font-size:15px;line-height:1.5;"><strong>Next step:</strong> after signing in, go to <strong>Patient Intake &amp; Consents</strong> to complete your intake package. Please finish it within 5 days of receiving this invitation.</p>
      <p style="font-size:13px;line-height:1.5;color:#675f54;margin-top:24px;">Questions? Reply to this email at <a href="mailto:connect@rlth.org" style="color:#2b2926;">connect@rlth.org</a>.</p>
      <p style="font-size:13px;line-height:1.5;color:#675f54;">— Revealing Leads to Healing Wellness Services, LLC</p>
    </div>
  </body>
</html>`;

    const payload = JSON.stringify({
      FromEmailAddress: FROM_ADDRESS,
      Destination: { ToAddresses: [input.email] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: textBody, Charset: "UTF-8" },
            Html: { Data: htmlBody, Charset: "UTF-8" },
          },
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
