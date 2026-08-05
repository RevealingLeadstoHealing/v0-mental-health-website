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
      ? "Complete first login, set the permanent password, enroll authenticator MFA, and verify authenticated audit/record API calls from /login."
      : "Add AWS server runtime credentials or OIDC role access in Vercel before PHI can be stored.",
    note: "AWS foundation, Cognito-aware auth routes, secure cookie sessions, owner user setup, and protected EHR API routes are configured. Do not store PHI until first-user login, server authorization, audit writes, backup verification, signed compliance documentation, and operating policies are confirmed end-to-end.",
  });
}
