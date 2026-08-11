import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../../lib/ehr/auth";
import { requireClientAccess } from "../../../../../lib/ehr/authorization";
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
    await requireClientAccess(actor, clientId);

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
      uploadHeaders: {
        "content-type": contentType,
        "x-amz-server-side-encryption": "aws:kms",
        "x-amz-server-side-encryption-aws-kms-key-id": rlthAwsFoundation.kmsKeyArn,
      },
      expiresInSeconds: 300,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff", "client"]);

    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") || actor.sub;
    const key = url.searchParams.get("key") || "";
    if (!key) throw new ApiError(400, "Document storage key is required.");
    if (actor.role === "client" && clientId !== actor.sub) {
      throw new ApiError(403, "Clients can only open documents from their own chart.");
    }
    await requireClientAccess(actor, clientId);

    const expectedPrefix = [
      "ehr-documents",
      actor.practiceId,
      `client-${safeSegment(clientId)}`,
    ].join("/") + "/";
    if (!key.startsWith(expectedPrefix)) {
      throw new ApiError(403, "This document does not belong to the authorized client chart.");
    }

    const downloadUrl = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({
        Bucket: rlthAwsFoundation.documentsBucketName,
        Key: key,
      }),
      { expiresIn: 300 }
    );

    await appendAuditEvent(actor, {
      action: "Authorized private document download",
      category: "Document Access",
      clientId,
      entityType: "document-download",
      entityId: key,
      summary: "A five-minute private document download link was issued after chart authorization.",
    });

    return NextResponse.json({ downloadUrl, expiresInSeconds: 300 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
