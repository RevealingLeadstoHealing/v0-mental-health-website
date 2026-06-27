import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../../lib/ehr/auth";
import { appendAuditEvent } from "../../../../../lib/ehr/dynamodb-store";
import { getS3Client } from "../../../../../lib/ehr/aws-runtime";
import { rlthAwsFoundation } from "../../../../../lib/rlth-aws-foundation";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff", "client"]);

    const body = await request.json();
    const clientId = typeof body.clientId === "string" ? body.clientId : actor.sub;
    const documentType = typeof body.documentType === "string" ? body.documentType : "document";
    const fileName = typeof body.fileName === "string" ? body.fileName : "upload.bin";
    const contentType = typeof body.contentType === "string" ? body.contentType : "application/octet-stream";

    if (actor.role === "client" && clientId !== actor.sub) {
      throw new ApiError(403, "Clients can only upload documents to their own chart.");
    }

    const documentId = `document_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const key = [
      "ehr-documents",
      actor.practiceId,
      `client-${safeSegment(clientId)}`,
      safeSegment(documentType),
      `${documentId}-${safeSegment(fileName)}`,
    ].join("/");

    const command = new PutObjectCommand({
      Bucket: rlthAwsFoundation.documentsBucketName,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: rlthAwsFoundation.kmsKeyArn,
      Metadata: {
        practiceId: actor.practiceId,
        clientId: safeSegment(clientId),
        documentType: safeSegment(documentType),
        uploadedBy: actor.sub,
      },
    });

    const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 300 });

    await appendAuditEvent(actor, {
      action: "Created private document upload link",
      category: "Document",
      clientId,
      entityType: "document-upload",
      entityId: documentId,
      summary: "A time-limited private S3 upload link was created.",
    });

    return NextResponse.json({
      documentId,
      key,
      uploadUrl,
      expiresInSeconds: 300,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
