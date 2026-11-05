import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../../lib/ehr/auth";
import { requireClientAccess } from "../../../../../lib/ehr/authorization";
import { appendAuditEvent, putDocumentMetadata } from "../../../../../lib/ehr/dynamodb-store";
import { getDynamoDocumentClient, getS3Client } from "../../../../../lib/ehr/aws-runtime";
import { rlthAwsFoundation } from "../../../../../lib/rlth-aws-foundation";
import { documentStorageKey, newDocumentId, safeSegment } from "../../../../../lib/ehr/document-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Attach a captured Spruce inbox item (fax or call recording) to a client's
// chart. The stored encrypted object is COPIED (never moved) into the chart's
// document storage using the exact same KMS-encrypted write and metadata path
// as app/api/ehr/documents/upload/route.ts, an audit event is recorded, and
// the inbox row is flipped to "filed" with linkedClientId set. Leaving the
// webhook's original object untouched keeps the receiver's output intact.
//
// requireClientAccess() is the chart-access gate and must stay: a provider may
// only file an item into a chart they are assigned to.
// ---------------------------------------------------------------------------

type SpruceInboxRow = {
  itemId?: string;
  kind?: string;
  fromNumber?: string;
  createdAt?: string;
  status?: string;
  storageKey?: string;
  practiceId?: string;
};

function inboxPartitionKey(practiceId: string) {
  return `PRACTICE#${practiceId}#SPRUCE_INBOX`;
}

function spruceStoragePrefix(practiceId: string) {
  return `spruce-inbox/${practiceId}/`;
}

async function loadInboxItem(practiceId: string, itemId: string, createdAt: string) {
  const response = await getDynamoDocumentClient().send(
    new QueryCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      KeyConditionExpression: "PK = :pk AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": inboxPartitionKey(practiceId),
        ":sk": `ITEM#${createdAt}#${itemId}`,
      },
      Limit: 1,
    })
  );
  return (response.Items || [])[0] as SpruceInboxRow | undefined;
}

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);

    const body = (await request.json()) as {
      itemId?: unknown;
      createdAt?: unknown;
      clientId?: unknown;
    };
    const itemId = typeof body.itemId === "string" ? body.itemId : "";
    const createdAt = typeof body.createdAt === "string" ? body.createdAt : "";
    const clientId = typeof body.clientId === "string" ? body.clientId : "";

    if (!itemId || !createdAt || !clientId) {
      throw new ApiError(400, "itemId, createdAt, and clientId are required.");
    }

    const item = await loadInboxItem(actor.practiceId, itemId, createdAt);
    if (!item) {
      throw new ApiError(404, "That Spruce inbox item was not found.");
    }
    if (item.practiceId !== actor.practiceId) {
      throw new ApiError(409, "That inbox item does not belong to this practice.");
    }
    const sourceKey = item.storageKey || "";
    if (!sourceKey || !sourceKey.startsWith(spruceStoragePrefix(actor.practiceId))) {
      throw new ApiError(409, "That inbox item does not have a stored file to attach.");
    }

    // Chart-access gate — only providers assigned to this client (or owner) pass.
    await requireClientAccess(actor, clientId);

    const kind = item.kind === "call" ? "call" : "fax";

    // Read the stored encrypted object out of the spruce-inbox prefix.
    const source = await getS3Client().send(
      new GetObjectCommand({
        Bucket: rlthAwsFoundation.documentsBucketName,
        Key: sourceKey,
      })
    );
    const bytes = source.Body ? await source.Body.transformToByteArray() : undefined;
    if (!bytes || bytes.length === 0) {
      throw new ApiError(409, "The stored file for that inbox item could not be read.");
    }
    const contentType = kind === "fax" ? "application/pdf" : "audio/mpeg";

    // Write a KMS-encrypted copy into the chart's document storage (mirrors
    // app/api/ehr/documents/upload/route.ts exactly).
    const documentId = newDocumentId();
    const fileName = `spruce-${kind}-${safeSegment(itemId)}.${kind === "fax" ? "pdf" : "mp3"}`;
    const key = documentStorageKey(actor.practiceId, clientId, "clinical", documentId, fileName);

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: rlthAwsFoundation.documentsBucketName,
        Key: key,
        Body: Buffer.from(bytes),
        ContentType: contentType,
        ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: rlthAwsFoundation.kmsKeyArn,
        Metadata: {
          practiceId: actor.practiceId,
          clientId: safeSegment(clientId),
          documentType: "clinical",
          uploadedBy: actor.sub,
        },
      })
    );

    const title = kind === "fax"
      ? "Inbound fax from " + (item.fromNumber || "unknown")
      : "Inbound call recording from " + (item.fromNumber || "unknown");

    await putDocumentMetadata(actor, {
      documentId,
      practiceId: actor.practiceId,
      clientId,
      uploadedBy: actor.sub,
      title,
      documentType: "clinical",
      storageKey: key,
      accessLevel: "provider_only",
    });

    await appendAuditEvent(actor, {
      action: "Filed Spruce inbox item to chart",
      category: "Document",
      clientId,
      entityType: "spruce-inbox-item",
      entityId: itemId,
      summary: "A captured Spruce inbox item was filed into a client chart as an encrypted document.",
    });

    // Flip the inbox row to filed and record the linked client.
    const now = new Date().toISOString();
    await getDynamoDocumentClient().send(
      new UpdateCommand({
        TableName: rlthAwsFoundation.clinicalRecordsTableName,
        Key: {
          PK: inboxPartitionKey(actor.practiceId),
          SK: `ITEM#${createdAt}#${itemId}`,
        },
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
        UpdateExpression:
          "SET #status = :status, linkedClientId = :clientId, handledAt = :handledAt, handledBy = :handledBy",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": "filed",
          ":clientId": clientId,
          ":handledAt": now,
          ":handledBy": actor.sub,
        },
      })
    );

    return NextResponse.json({ documentId, clientId });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
