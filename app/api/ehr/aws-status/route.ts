import { NextResponse } from "next/server";
import { getAwsRegion, getCognitoRegion, getRuntimeReadiness } from "../../../../lib/ehr/aws-runtime";
import { getRlthAwsFoundationStatus, rlthAwsFoundation } from "../../../../lib/rlth-aws-foundation";

export async function GET() {
  const runtime = getRuntimeReadiness();

  return NextResponse.json({
    ...getRlthAwsFoundationStatus(),
    // Reported separately because they are genuinely different regions: the data
    // resources are us-east-2 and the Cognito pool is us-east-1. If cognitoRegion ever
    // stops matching the prefix of cognitoUserPoolId, authentication will fail.
    dataRegion: getAwsRegion(),
    cognitoRegion: getCognitoRegion(),
    cognitoUserPoolId: rlthAwsFoundation.cognitoUserPoolId,
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
