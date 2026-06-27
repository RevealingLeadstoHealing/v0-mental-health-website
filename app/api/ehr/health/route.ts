import { NextResponse } from "next/server";
import { getRuntimeReadiness } from "../../../../lib/ehr/aws-runtime";
import { getRlthAwsFoundationStatus } from "../../../../lib/rlth-aws-foundation";

export async function GET() {
  const runtime = getRuntimeReadiness();

  return NextResponse.json({
    status: runtime.runtimeCredentialsConfigured ? "ready-for-authenticated-api" : "missing-aws-runtime-credentials",
    foundation: getRlthAwsFoundationStatus(),
    runtime,
    requiredServerSecrets: runtime.runtimeCredentialsConfigured
      ? []
      : ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
    phiEntryAllowed: false,
    note: "Backend routes are installed. Real PHI entry remains disabled until AWS runtime credentials, Cognito login, server authorization, audit writes, and signed compliance documents are verified end-to-end.",
  });
}
