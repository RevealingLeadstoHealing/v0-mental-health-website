import { NextResponse } from "next/server";
import { getRlthAwsFoundationStatus, rlthAwsFoundation } from "../../../../lib/rlth-aws-foundation";

export async function GET() {
  return NextResponse.json({
    ...getRlthAwsFoundationStatus(),
    resources: {
      clinicalRecordsTableName: rlthAwsFoundation.clinicalRecordsTableName,
      auditEventsTableName: rlthAwsFoundation.auditEventsTableName,
      documentMetadataTableName: rlthAwsFoundation.documentMetadataTableName,
      documentsBucketName: rlthAwsFoundation.documentsBucketName,
    },
    note: "AWS foundation is configured. Do not store PHI until production auth, server API authorization, IAM access, audit writes, backup verification, and signed compliance documentation are confirmed.",
  });
}
