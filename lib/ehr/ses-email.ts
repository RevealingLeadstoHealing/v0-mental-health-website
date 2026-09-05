import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { rlthAwsFoundation } from "../rlth-aws-foundation";

let sesClient: SESClient | null = null;

function getSesClient() {
  if (!sesClient) {
    sesClient = new SESClient({ region: rlthAwsFoundation.region });
  }
  return sesClient;
}

export type EhrEmailTemplate =
  | "provider-invite"
  | "password-reset-confirmation"
  | "session-expiry-notice"
  | "account-locked-notice";

export interface EhrEmailParams {
  toAddress: string;
  subject: string;
  /** Plain-text body — always required for accessibility and spam filter compliance. */
  textBody: string;
  /** Optional HTML body. If omitted, only the text body is sent. */
  htmlBody?: string;
}

/**
 * Send a transactional email via AWS SES.
 *
 * Requirements before this works in production:
 * 1. The sending domain must be verified in SES (Route 53 DKIM/SPF records).
 * 2. The SES account must be out of sandbox mode (production access requested).
 * 3. EHR_SES_FROM_ADDRESS must be set in the environment.
 * 4. The Vercel runtime IAM user must have the ses:SendEmail policy attached
 *    (see infra/aws/rlth-ehr-vercel-runtime-iam.yaml — VercelSesPolicy).
 */
export async function sendEhrEmail(params: EhrEmailParams): Promise<void> {
  const fromAddress = process.env.EHR_SES_FROM_ADDRESS;

  if (!fromAddress) {
    throw new Error(
      "[RLTH EHR] EHR_SES_FROM_ADDRESS is not set. " +
        "Configure your verified SES sender address before sending email."
    );
  }

  const command = new SendEmailCommand({
    Source: `RLTH EHR <${fromAddress}>`,
    Destination: {
      ToAddresses: [params.toAddress],
    },
    Message: {
      Subject: {
        Data: params.subject,
        Charset: "UTF-8",
      },
      Body: {
        Text: {
          Data: params.textBody,
          Charset: "UTF-8",
        },
        ...(params.htmlBody
          ? {
              Html: {
                Data: params.htmlBody,
                Charset: "UTF-8",
              },
            }
          : {}),
      },
    },
    // ConfigurationSetName can be added here when a CloudWatch/SNS bounce
    // configuration set is set up for delivery tracking.
  });

  await getSesClient().send(command);
}

/**
 * Build a provider invitation email body.
 * Called by the admin user-management API route when creating a new provider account.
 */
export function buildProviderInviteEmail(params: {
  recipientName: string;
  tempPassword: string;
  loginUrl: string;
}): Pick<EhrEmailParams, "subject" | "textBody" | "htmlBody"> {
  const subject = "Your Revealing Leads to Healing EHR account is ready";

  const textBody = [
    `Hello ${params.recipientName},`,
    "",
    "Your account for the Revealing Leads to Healing EHR system has been created.",
    "",
    `Login URL: ${params.loginUrl}`,
    `Temporary password: ${params.tempPassword}`,
    "",
    "You will be prompted to set a permanent password and enroll your authenticator",
    "app (Microsoft Authenticator, Google Authenticator, or similar) on first login.",
    "",
    "Do not share this email or your temporary password.",
    "",
    "Revealing Leads to Healing Counseling & Wellness Services, LLC",
  ].join("\n");

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="font-family:Arial,sans-serif;color:#2b2926;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="color:#2b2926;">Your RLTH EHR account is ready</h2>
  <p>Hello ${escapeHtml(params.recipientName)},</p>
  <p>Your account for the <strong>Revealing Leads to Healing EHR</strong> system has been created.</p>
  <table style="border:1px solid #ddd3c1;border-radius:8px;padding:16px;background:#f8f7f4;width:100%;">
    <tr><td style="padding:4px 0;font-weight:bold;">Login URL</td><td><a href="${escapeHtml(params.loginUrl)}">${escapeHtml(params.loginUrl)}</a></td></tr>
    <tr><td style="padding:4px 0;font-weight:bold;">Temporary password</td><td style="font-family:monospace;">${escapeHtml(params.tempPassword)}</td></tr>
  </table>
  <p>You will be prompted to set a permanent password and enroll your authenticator app on first login.</p>
  <p style="color:#796f63;font-size:.85rem;">Do not share this email or your temporary password.</p>
  <hr style="border:none;border-top:1px solid #ddd3c1;margin:24px 0;">
  <p style="color:#796f63;font-size:.85rem;">Revealing Leads to Healing Counseling &amp; Wellness Services, LLC</p>
</body>
</html>`;

  return { subject, textBody, htmlBody };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
