import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDocumentClient, getS3Client } from "../../../../lib/ehr/aws-runtime";
import { rlthAwsFoundation } from "../../../../lib/rlth-aws-foundation";
import { verifySpruceSignature } from "../../../../lib/spruce/verify-webhook";
import { fetchSpruceConversationItem } from "../../../../lib/spruce/api-client";

// ---------------------------------------------------------------------------
// Incoming Spruce webhook: picks up faxes and call/voicemail recordings the
// moment Spruce receives them, downloads the file from the short-lived
// signedUrl Spruce provides (it expires in roughly 15 minutes), stores a
// permanent encrypted copy in the practice's own S3 bucket, and raises a
// standing alert -- the same "won't go away until acknowledged" alert the
// provider already sees for new bookings and consultation requests.
//
// This does NOT change the practice's phone or fax number, and it does not
// stop Spruce from working normally; it is a read-only listener on top of
// the existing Spruce account. It requires two things only the practice
// owner can set up (both are account credentials, not something this code
// can create on its own):
// 1. SPRUCE_API_TOKEN -- the "Live Secret" from Spruce Settings ->
//    Integrations & API (not the Access ID, which starts with "aid_").
// 2. SPRUCE_WEBHOOK_SECRET -- issued by Spruce when this endpoint's URL
//    (https://<domain>/api/spruce/webhook) is registered as a webhook
//    destination in Spruce (POST https://api.sprucehealth.com/v1/webhooks/endpoints
//    with the Live Secret as the bearer token).
// Until both are set in the hosting environment, this endpoint safely
// rejects every request (signature verification fails closed).
//
// --- Payload shape, verified directly against Spruce's own developer docs
// (developer.sprucehealth.com/docs/webhooks-overview and
// .../docs/retrieving-a-call-recording-from-a-conversationitem) on
// 2026-09-16 -- an earlier version of this file guessed a flatter shape
// that does not match Spruce's real payload and would have silently
// classified every event as "unrecognized" forever. The real shapes:
//
//   Webhook delivery (top level):
//     { eventTime, object: "event", type: "conversationItem.created",
//       data: { object: { ...conversationItem } } }
//   -- the conversationItem is nested at data.object, NOT data itself.
//
//   A conversationItem that came from a phone call additionally carries:
//     item.event = { type: "inboundCall" | "outboundCall",
//                     data: { recordings: [ { mimetype, signedUrl: { url, expiresAt } } ] } }
//   -- recordings[].signedUrl is an OBJECT with a .url field, not a bare string.
//
//   Direct GET /v1/conversationItems/{id} (the fallback re-fetch path) wraps
//   its result as { conversationItem: { ... } }, not { data: { ... } }.
//
//   Spruce's docs do not show a worked fax example, so fax detection below
//   is deliberately broad (conversation type, event type, or a PDF-like
//   attachment) rather than keyed to one exact field -- re-check against a
//   real captured payload the first time an actual fax comes through, and
//   tighten this if it turns out to be wrong.
// ---------------------------------------------------------------------------

const practiceId = "rlth";

type SpruceSignedUrl = string | { url?: string; expiresAt?: string };
type SpruceRecording = { mimetype?: string; signedUrl?: SpruceSignedUrl };
type SpruceAttachment = { signedUrl?: SpruceSignedUrl; mimetype?: string; type?: string };
type SpruceCallEvent = { type?: string; data?: { recordings?: SpruceRecording[] } };
type SpruceConversationItem = {
    id?: string;
    conversationId?: string;
    createdAt?: string;
    attachments?: SpruceAttachment[];
    event?: SpruceCallEvent;
    conversation?: { type?: string };
    author?: { phoneNumber?: string; name?: string; entityId?: string };
    source?: { value?: string };
    type?: string;
    signedUrl?: SpruceSignedUrl;
    recordings?: SpruceRecording[];
};

function resolveUrl(value: SpruceSignedUrl | undefined): string {
    if (!value) return "";
    return typeof value === "string" ? value : value.url || "";
}

function extractSourceNumber(item: SpruceConversationItem) {
    return item.author?.phoneNumber || item.source?.value || "";
}

function classifyItem(item: SpruceConversationItem): "fax" | "call" | null {
    const callType = String(item.event?.type || item.type || "").toLowerCase();
    const callRecordings = item.event?.data?.recordings || item.recordings || [];
    if (callRecordings.length > 0 || callType.includes("call") || callType.includes("voicemail")) {
          return "call";
    }

  const conversationType = String(item.conversation?.type || "").toLowerCase();
    const attachmentLooksLikeFax = (item.attachments || []).some((a) =>
          String(a.mimetype || a.type || "").toLowerCase().includes("pdf")
                                                                   );
    if (conversationType.includes("fax") || callType.includes("fax") || attachmentLooksLikeFax) {
          return "fax";
    }

  return null;
}

function findSignedUrl(item: SpruceConversationItem, kind: "fax" | "call") {
    if (kind === "call") {
          const recordings = item.event?.data?.recordings || item.recordings || [];
          return resolveUrl(recordings[0]?.signedUrl);
    }
    const fromTopLevel = resolveUrl(item.signedUrl);
    if (fromTopLevel) return fromTopLevel;
    const faxAttachment = (item.attachments || []).find((a) => resolveUrl(a.signedUrl));
    return resolveUrl(faxAttachment?.signedUrl);
}


async function recordInboxAlert(params: {
  kind: "fax" | "call";
  itemId: string;
  fromNumber: string;
  note: string;
  storageKey: string;
}) {
  const now = new Date().toISOString();
  const alertId = `spruce_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const label = params.kind === "fax" ? "Incoming fax" : "Incoming call recording / voicemail";
  await getDynamoDocumentClient().send(new PutCommand({
    TableName: rlthAwsFoundation.clinicalRecordsTableName,
    Item: {
      PK: `PRACTICE#${practiceId}#SPRUCE_INBOX`,
      SK: `ITEM#${now}#${params.itemId}`,
      recordType: "spruce-inbox-item",
      itemId: params.itemId,
      practiceId,
      kind: params.kind,
      fromNumber: params.fromNumber,
      storageKey: params.storageKey,
      note: params.note,
      linkedClientId: "",
      status: params.storageKey ? "new" : "needs-attention",
      createdAt: now,
    },
  }));
  await getDynamoDocumentClient().send(new PutCommand({
    TableName: rlthAwsFoundation.clinicalRecordsTableName,
    Item: {
      PK: `PRACTICE#${practiceId}#BOOKING_ALERTS`,
      SK: `ALERT#${now}#${alertId}`,
      recordType: "spruce-inbox-alert",
      alertId,
      practiceId,
      clientId: "",
      clientName: label,
      contactEmail: "",
      contactPhone: params.fromNumber,
      contactMessage: params.note,
      appointmentDate: "",
      appointmentTime: "",
      appointmentFormat: "",
      appointmentPurpose: `Spruce ${params.kind} received`,
      bookedByRole: "spruce-webhook",
      createdAt: now,
      acknowledgedAt: "",
      acknowledgedBy: "",
    },
  }));
}

async function storeSpruceFile(kind: "fax" | "call", itemId: string, signedUrl: string) {
  const fileResponse = await fetch(signedUrl, { cache: "no-store" });
  if (!fileResponse.ok) {
    throw new Error(`Could not download the ${kind} file from Spruce (status ${fileResponse.status}). Its signedUrl may have already expired.`);
  }
  const contentType = fileResponse.headers.get("content-type") || (kind === "fax" ? "application/pdf" : "audio/mpeg");
  const extension = kind === "fax" ? "pdf" : (contentType.includes("wav") ? "wav" : "mp3");
  const bytes = new Uint8Array(await fileResponse.arrayBuffer());
  const key = `spruce-inbox/${practiceId}/${itemId}.${extension}`;
  await getS3Client().send(new PutObjectCommand({
    Bucket: rlthAwsFoundation.documentsBucketName,
    Key: key,
    Body: bytes,
    ContentType: contentType,
    ServerSideEncryption: "aws:kms",
    SSEKMSKeyId: rlthAwsFoundation.kmsKeyArn,
    Metadata: { practiceId, source: "spruce-webhook", kind, itemId },
  }));
  return key;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-spruce-signature");
  const secret = process.env.SPRUCE_WEBHOOK_SECRET || "";
  if (!verifySpruceSignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: "Invalid or missing webhook signature." }, { status: 401 });
  }

let event: { type?: string; data?: { object?: SpruceConversationItem } & Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed webhook payload." }, { status: 400 });
  }

if (event.type !== "conversationItem.created" || !event.data) {
  return NextResponse.json({ received: true, handled: false });
}

const item: SpruceConversationItem = (event.data.object ?? event.data) as SpruceConversationItem;
  const kind = classifyItem(item);
  if (!kind) {
    return NextResponse.json({ received: true, handled: false });
  }

const itemId = item.id || `unknown_${Date.now()}`;
  const fromNumber = extractSourceNumber(item);

try {
  let signedUrl = findSignedUrl(item, kind);
  if (!signedUrl && item.id) {
    try {
      const refetched = await fetchSpruceConversationItem(item.id) as {
        conversationItem?: SpruceConversationItem;
      } & Record<string, unknown>;
      const refetchedItem = (refetched?.conversationItem ?? refetched) as SpruceConversationItem;
      signedUrl = findSignedUrl(refetchedItem, kind);
    } catch {
    }
  }

  if (!signedUrl) {
    await recordInboxAlert({
      kind,
      itemId,
      fromNumber,
      storageKey: "",
      note: `A ${kind} arrived from Spruce but no downloadable file URL was found in the event. Check this conversation directly in Spruce (conversation ${item.conversationId || "unknown"}).`,
    });
    return NextResponse.json({ received: true, handled: true, stored: false });
  }

  const storageKey = await storeSpruceFile(kind, itemId, signedUrl);
  await recordInboxAlert({
    kind,
    itemId,
    fromNumber,
    storageKey,
    note: kind === "fax"
    ? `New fax received${fromNumber ? ` from ${fromNumber}` : ""}. Saved securely -- open the Spruce Inbox to view and link it to a client chart.`
      : `New call recording / voicemail received${fromNumber ? ` from ${fromNumber}` : ""}. Saved securely -- open the Spruce Inbox to listen and link it to a client chart.`,
  });
  return NextResponse.json({ received: true, handled: true, stored: true });
} catch (error) {
  try {
    await recordInboxAlert({
      kind,
      itemId,
      fromNumber,
      storageKey: "",
      note: `A ${kind} arrived from Spruce but could not be saved automatically: ${error instanceof Error ? error.message : "unknown error"}. Check this conversation directly in Spruce (conversation ${item.conversationId || "unknown"}).`,
    });
  } catch {
  }
  return NextResponse.json({ received: true, handled: true, stored: false });
}
}
