import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { appendAuditEvent } from "../../../../lib/ehr/dynamodb-store";
import { getDynamoDocumentClient, getS3Client } from "../../../../lib/ehr/aws-runtime";
import { rlthAwsFoundation } from "../../../../lib/rlth-aws-foundation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Spruce inbox — surfaces the faxes and call recordings that the live Spruce
// webhook (app/api/spruce/webhook/route.ts) already captured, encrypted, and
// stored under the "spruce-inbox/<practiceId>/" S3 prefix and recorded as
// DynamoDB rows at PK "PRACTICE#<practiceId>#SPRUCE_INBOX".
//
// This route is read-and-mark only: it lists items, presigns a short-lived
// GET URL for the stored encrypted object, and flips an item's own status
// field to "filed"/"handled". It never touches the webhook receiver, the
// standing-alert row, or any consent/authorization gate. No PHI is logged.
// ---------------------------------------------------------------------------

type SpruceInboxRow = {
  itemId?: string;
  kind?: string;
  fromNumber?: string;
  createdAt?: string;
  status?: string;
  linkedClientId?: string;
  storageKey?: string;
  practiceId?: string;
};

function inboxPartitionKey(practiceId: string) {
  return `PRACTICE#${practiceId}#SPRUCE_INBOX`;
}

function spruceStoragePrefix(practiceId: string) {
  return `spruce-inbox/${practiceId}/`;
}

function normalizeKind(value: unknown): "fax" | "call" {
  return value === "call" ? "call" : "fax";
}

async function loadInboxItem(practiceId: string, itemId: string, createdAt: string) {
  const dynamo = getDynamoDocumentClient();
  const response = await dynamo.send(
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
  const row = (response.Items || [])[0] as SpruceInboxRow | undefined;
  return row;
}

// ---------------------------------------------------------------------------
// GET — list inbox items, or (with ?id= &createdAt=) presign a view URL.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);

    const url = new URL(request.url);
    const itemId = url.searchParams.get("id") || "";
    const createdAt = url.searchParams.get("createdAt") || "";

    const dynamo = getDynamoDocumentClient();

    if (!itemId) {
      const response = await dynamo.send(
        new QueryCommand({
          TableName: rlthAwsFoundation.clinicalRecordsTableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :itemPrefix)",
          ExpressionAttributeValues: {
            ":pk": inboxPartitionKey(actor.practiceId),
            ":itemPrefix": "ITEM#",
          },
          ScanIndexForward: false,
          Limit: 100,
        })
      );
      const rows = (response.Items || []) as SpruceInboxRow[];
      const items = rows.map((row) => ({
        itemId: row.itemId || "",
        kind: normalizeKind(row.kind),
        fromNumber: row.fromNumber || "",
        createdAt: row.createdAt || "",
        status: row.status || "new",
        linkedClientId: row.linkedClientId || "",
        hasFile: Boolean(row.storageKey),
      }));
      return NextResponse.json({ items });
    }

    if (!createdAt) {
      throw new ApiError(400, "createdAt is required to open a specific inbox item.");
    }

    const item = await loadInboxItem(actor.practiceId, itemId, createdAt);
    if (!item) {
      throw new ApiError(404, "That Spruce inbox item was not found.");
    }
    if (item.practiceId !== actor.practiceId) {
      throw new ApiError(409, "That inbox item does not belong to this practice.");
    }
    const storageKey = item.storageKey || "";
    if (!storageKey || !storageKey.startsWith(spruceStoragePrefix(actor.practiceId))) {
      throw new ApiError(409, "That inbox item does not have a stored file to open.");
    }

    const kind = normalizeKind(item.kind);
    const contentType = kind === "fax" ? "application/pdf" : "audio/mpeg";
    const disposition = kind === "fax" ? "inline" : "attachment";

    const command = new GetObjectCommand({
      Bucket: rlthAwsFoundation.documentsBucketName,
      Key: storageKey,
      ResponseContentType: contentType,
      ResponseContentDisposition: disposition,
    });
    const viewUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 300 });

    await appendAuditEvent(actor, {
      action: "Opened Spruce inbox item",
      category: kind === "fax" ? "Fax" : "Communication",
      entityType: "spruce-inbox-item",
      entityId: itemId,
      summary: "A time-limited private link to a stored Spruce inbox item was generated.",
    });

    return NextResponse.json({ viewUrl, kind, expiresInSeconds: 300 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// PATCH — mark an item filed/handled (status only; no PHI).
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);

    const body = (await request.json()) as {
      itemId?: unknown;
      createdAt?: unknown;
      status?: unknown;
    };
    const itemId = typeof body.itemId === "string" ? body.itemId : "";
    const createdAt = typeof body.createdAt === "string" ? body.createdAt : "";
    const status = typeof body.status === "string" ? body.status : "";

    if (!itemId || !createdAt) {
      throw new ApiError(400, "itemId and createdAt are required.");
    }
    if (status !== "filed" && status !== "handled") {
      throw new ApiError(400, "status must be 'filed' or 'handled'.");
    }

    const now = new Date().toISOString();
    await getDynamoDocumentClient().send(
      new UpdateCommand({
        TableName: rlthAwsFoundation.clinicalRecordsTableName,
        Key: {
          PK: inboxPartitionKey(actor.practiceId),
          SK: `ITEM#${createdAt}#${itemId}`,
        },
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
        UpdateExpression: "SET #status = :status, handledAt = :handledAt, handledBy = :handledBy",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": status,
          ":handledAt": now,
          ":handledBy": actor.sub,
        },
      })
    );

    await appendAuditEvent(actor, {
      action: "Marked Spruce inbox item " + status,
      category: "Fax",
      entityType: "spruce-inbox-item",
      entityId: itemId,
      summary: "A Spruce inbox item's handling status was updated.",
    });

    return NextResponse.json({ itemId, status });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
