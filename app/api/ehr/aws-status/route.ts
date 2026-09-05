import { NextResponse } from "next/server";
import { getRuntimeReadiness } from "../../../../lib/ehr/aws-runtime";
import { getRlthAwsFoundationStatus, rlthAwsFoundation } from "../../../../lib/rlth-aws-foundation";

export async function GET() {
  const runtime = getRuntimeReadiness();

  return NextResponse.json({
    ...getRlthAwsFoundationStatus(),
    runtimeCredentialsConfigured: runtime.runtimeCredentialsConfigured,
    apiRoutesInstalled: true,
    authRoutesInstalled: true,
    resources: {
      clinicalRecordsTableName: rlthAwsFoundation.clinicalRecordsTableName,
      auditEventsTableName: rlthAwsFoundation.auditEventsTableName,
      documentMetadataTableName: rlthAwsFoundation.documentMetadataTableName,
      documentsBucketName: rlthAwsFoundation.documentsBucketName,
    },
    nextRequiredStep: runtime.runtimeCredentialsConfigured
      ? "Confirm the Ohio security-operations stack and production approval setting."
      : "Attach the approved AWS runtime role to the Amplify Hosting compute branch.",
    note: "AWS foundation, Cognito authentication, secure cookie sessions, protected EHR APIs, encrypted persistence, and audit routes are configured. Production approval remains controlled by EHR_PHI_ENTRY_ALLOWED.",
  });
}
