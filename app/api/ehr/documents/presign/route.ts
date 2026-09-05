import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../../lib/ehr/auth";
import { appendAuditEvent, putDocumentMetadata } from "../../../../../lib/ehr/dynamodb-store";
import { getS3Client } from "../../../../../lib/ehr/aws-runtime";
import { rlthAwsFoundation } from "../../../../../lib/rlth-aws-foundation";
import type { AccessLevel } from "../../../../../lib/ehr/domain-model";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

const ALLOWED_DOCUMENT_TYPES = [
  "consent",
  "assessment",
  "insurance",
  "clinical",
  "billing",
  "other",
] as const;

type AllowedDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

function isAllowedDocumentType(value: string): value is AllowedDocumentType {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// POST — generate a presigned S3 upload URL
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff", "client"]);

    const body = await request.json();
    const clientId = typeof body.clientId === "string" ? body.clientId : actor.sub;
    const rawDocumentType = typeof body.documentType === "string" ? body.documentType : "other";
    const documentType: AllowedDocumentType = isAllowedDocumentType(rawDocumentType)
      ? rawDocumentType
      : "other";
    const fileName = typeof body.fileName === "string" ? body.fileName : "upload.bin";
    const contentType =
      typeof body.contentType === "string" ? body.contentType : "application/octet-stream";
    const title = typeof body.title === "string" ? body.title.slice(0, 200) : fileName;
    const accessLevel: AccessLevel =
      typeof body.accessLevel === "string"
        ? (body.accessLevel as AccessLevel)
        : "provider_only";

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

    // Write metadata to DynamoDB immediately so the document is tracked,
    // listable, and access-controlled from the moment the upload link is issued.
    await putDocumentMetadata(actor, {
      documentId,
      practiceId: actor.practiceId,
      clientId,
      uploadedBy: actor.sub,
      title,
      documentType,
      storageKey: key,
      accessLevel,
    });

    await appendAuditEvent(actor, {
      action: "Created private document upload link",
      category: "Document",
      clientId,
      entityType: "document-upload",
      entityId: documentId,
      summary:
        "A time-limited private S3 upload link was created and document metadata was recorded.",
    });

    // uploadHeaders must be sent with every S3 PUT — Content-Type must match
    // what was signed or S3 will reject the upload with a 403 SignatureDoesNotMatch.
    return NextResponse.json({
      documentId,
      key,
      uploadUrl,
      expiresInSeconds: 300,
      uploadHeaders: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// GET — generate a presigned S3 download URL for an existing object
// Called by signed-documents.tsx openOriginal() to open uploaded files
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff", "client"]);

    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") || actor.sub;
    const key = url.searchParams.get("key") || "";

    if (!key) {
      throw new ApiError(400, "key is required.");
    }

    // Enforce path-based ownership: the key must belong to this practice and client.
    const expectedPrefix = `ehr-documents/${actor.practiceId}/client-${safeSegment(clientId)}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new ApiError(403, "Document key does not belong to this chart.");
    }

    if (actor.role === "client" && clientId !== actor.sub) {
      throw new ApiError(403, "Clients can only access their own documents.");
    }

    const command = new GetObjectCommand({
      Bucket: rlthAwsFoundation.documentsBucketName,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 300 });

    await appendAuditEvent(actor, {
      action: "Generated document download link",
      category: "Document",
      clientId,
      entityType: "document-download",
      summary: "A time-limited private S3 download link was generated.",
    });

    return NextResponse.json({ downloadUrl, expiresInSeconds: 300 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
