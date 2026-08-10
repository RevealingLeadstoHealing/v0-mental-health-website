import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../../lib/ehr/auth";
import { requireClientAccess } from "../../../../../lib/ehr/authorization";
import { appendAuditEvent } from "../../../../../lib/ehr/dynamodb-store";
import { assertHealthScribeConfigured, healthScribeBucket, healthScribeKmsKeyArn, healthScribeS3 } from "../../../../../lib/ehr/healthscribe";

const contentTypes: Record<string, string> = {
  "audio/webm": "webm", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mpeg": "mp3",
  "audio/mp4": "mp4", "audio/ogg": "ogg", "audio/flac": "flac",
};

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);
    assertHealthScribeConfigured();
    const body = await request.json();
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const contentType = typeof body.contentType === "string" ? body.contentType.split(";")[0] : "";
    if (!clientId) throw new ApiError(400, "clientId is required.");
    if (!contentTypes[contentType]) throw new ApiError(400, "Unsupported audio format.");
    if (body.consentConfirmed !== true) throw new ApiError(400, "Recording and AI-scribe consent must be confirmed.");
    await requireClientAccess(actor, clientId);
    const key = `temporary-audio/${actor.practiceId}/${clientId}/${randomUUID()}.${contentTypes[contentType]}`;
    const command = new PutObjectCommand({
      Bucket: healthScribeBucket,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: healthScribeKmsKeyArn,
      Metadata: { application: "rlth-ehr", retention: "temporary" },
    });
    const uploadUrl = await getSignedUrl(healthScribeS3, command, { expiresIn: 300 });
    await appendAuditEvent(actor, {
      action: "Authorized temporary telehealth audio upload",
      category: "AI Scribe",
      clientId,
      entityType: "temporary-audio",
      summary: "A five-minute encrypted upload URL was issued after consent confirmation.",
    });
    return NextResponse.json({
      uploadUrl,
      uploadHeaders: {
        "content-type": contentType,
        "x-amz-server-side-encryption": "aws:kms",
        "x-amz-server-side-encryption-aws-kms-key-id": healthScribeKmsKeyArn,
      },
      key,
      expiresIn: 300,
    });
  } catch (error) { return apiErrorResponse(error); }
}
