import { NextResponse } from "next/server";
import { getRuntimeReadiness } from "../../../../lib/ehr/aws-runtime";
import { getRlthAwsFoundationStatus } from "../../../../lib/rlth-aws-foundation";

export async function GET() {
  const runtime = getRuntimeReadiness();
  const phiEntryAllowed = process.env.EHR_PHI_ENTRY_ALLOWED === "true";

  return NextResponse.json({
    status: !runtime.runtimeCredentialsConfigured
      ? "missing-aws-runtime-credentials"
      : phiEntryAllowed
        ? "production-ready"
        : "infrastructure-ready-production-approval-required",
    foundation: getRlthAwsFoundationStatus(),
    runtime,
    requiredServerSecrets: runtime.runtimeCredentialsConfigured
      ? []
      : ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
    phiEntryAllowed,
    note: phiEntryAllowed
      ? "Authenticated EHR API access and the practice production approval are enabled."
      : "Authenticated EHR APIs are installed. Enable the production approval only after the Ohio security stack, backup verification, BAAs, and operating policies are confirmed.",
  });
}
