import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../../lib/ehr/auth";
import { appendAuditEvent, putDocumentMetadata } from "../../../../../lib/ehr/dynamodb-store";
import { getS3Client } from "../../../../../lib/ehr/aws-runtime";
import { rlthAwsFoundation } from "../../../../../lib/rlth-aws-foundation";
import {
  documentStorageKey,
  MAX_SERVER_UPLOAD_BYTES,
  newDocumentId,
  normalizeDocumentType,
  safeSegment,
} from "../../../../../lib/ehr/document-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side upload path used when the browser cannot PUT directly to the
// presigned S3 URL (for example, the documents bucket has no CORS rule for the
// EHR origin). The file is streamed through the EHR server into the same
// KMS-encrypted bucket and key layout as presigned uploads.
export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff", "client"]);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Choose a file to upload.");
    if (file.size === 0) throw new ApiError(400, "The selected file is empty.");
    if (file.size > MAX_SERVER_UPLOAD_BYTES) {
      throw new ApiError(413, "The file is too large for secure upload. Use a file smaller than 4 MB.");
    }
    const clientIdValue = form.get("clientId");
    const clientId = typeof clientIdValue === "string" && clientIdValue ? clientIdValue : actor.sub;
    if (actor.role === "client" && clientId !== actor.sub) {
      throw new ApiError(403, "Clients can only upload documents to their own chart.");
    }
    const documentType = normalizeDocumentType(form.get("documentType"));
    const fileName = file.name || "upload.bin";
    const contentType = file.type || "application/octet-stream";
    const titleValue = form.get("title");
    const title = typeof titleValue === "string" && titleValue ? titleValue.slice(0, 200) : fileName;

    const documentId = newDocumentId();
    const key = documentStorageKey(actor.practiceId, clientId, documentType, documentId, fileName);

    await getS3Client().send(new PutObjectCommand({
      Bucket: rlthAwsFoundation.documentsBucketName,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: contentType,
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: rlthAwsFoundation.kmsKeyArn,
      Metadata: {
        practiceId: actor.practiceId,
        clientId: safeSegment(clientId),
        documentType: safeSegment(documentType),
        uploadedBy: actor.sub,
      },
    }));

    await putDocumentMetadata(actor, {
      documentId,
      practiceId: actor.practiceId,
      clientId,
      uploadedBy: actor.sub,
      title,
      documentType,
      storageKey: key,
      accessLevel: "provider_only",
    });

    await appendAuditEvent(actor, {
      action: "Uploaded private document",
      category: "Document",
      clientId,
      entityType: "document-upload",
      entityId: documentId,
      summary: "A document was uploaded through the EHR server to encrypted S3 storage.",
    });

    return NextResponse.json({ documentId, key });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
