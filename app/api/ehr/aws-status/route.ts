import { NextResponse } from "next/server";
import { getRuntimeReadiness } from "../../../../lib/ehr/aws-runtime";
import { getRlthAwsFoundationStatus, rlthAwsFoundation } from "../../../../lib/rlth-aws-foundation";

export async function GET() {
  const runtime = getRuntimeReadiness();

  return NextResponse.json({
    ...getRlthAwsFoundationStatus(),
    runtimeCredentialsConfigured: runtime.runtimeCredentialsConfigured,
    apiRoutesInstalled: true,
    resources: {
      clinicalRecordsTableName: rlthAwsFoundation.clinicalRecordsTableName,
      auditEventsTableName: rlthAwsFoundation.auditEventsTableName,
      documentMetadataTableName: rlthAwsFoundation.documentMetadataTableName,
      documentsBucketName: rlthAwsFoundation.documentsBucketName,
    },
    nextRequiredStep: runtime.runtimeCredentialsConfigured
      ? "Create Cognito users and connect the EHR UI to authenticated API calls."
      : "Add AWS server runtime credentials or OIDC role access in Vercel before PHI can be stored.",
    note: "AWS foundation and API routes are configured. Do not store PHI until production auth, server API authorization, IAM access, audit writes, backup verification, and signed compliance documentation are confirmed end-to-end.",
  });
}
