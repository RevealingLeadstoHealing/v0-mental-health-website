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
// standing alert — the same "won't go away until acknowledged" alert the
// provider already sees for new bookings and consultation requests.
//
// This does NOT change the practice's phone or fax number, and it does not
// stop Spruce from working normally; it is a read-only listener on top of
// the existing Spruce account. It requires two things only the practice
// owner can set up (both are account credentials, not something this code
// can create on its own):
//   1. SPRUCE_API_TOKEN — the "Live Secret" from Spruce Settings ->
//      Integrations & API (not the Access ID, which starts with "aid_").
//   2. SPRUCE_WEBHOOK_SECRET — issued by Spruce when this endpoint's URL
//      (https://<domain>/api/spruce/webhook) is registered as a webhook
//      destination in Spruce. Registering the destination can be done from
//      Spruce's API reference "Create a webhook destination endpoint" page
//      using the Live Secret as the bearer token.
// Until both are set in the hosting environment, this endpoint safely
// rejects every request (signature verification fails closed).
// ---------------------------------------------------------------------------

const practiceId = "rlth";

type SpruceRecording = { signedUrl?: string; expiresAt?: string };
type SpruceConversationItem = {
  id?: string;
  conversationId?: string;
  type?: string;
  createdAt?: string;
  signedUrl?: string;
  expiresAt?: string;
  recordings?: SpruceRecording[];
  attachments?: Array<{ signedUrl?: string; expiresAt?: string }>;
  author?: { phoneNumber?: string; name?: string; entityId?: string };
  source?: { value?: string };
};

function extractSourceNumber(item: SpruceConversationItem) {
  return item.author?.phoneNumber || item.source?.value || "";
}

function classifyItem(item: SpruceConversationItem): "fax" | "call" | null {
  const type = String(item.type || "").toLowerCase();
  if (type.includes("fax")) return "fax";
  if (Array.isArray(item.recordings) && item.recordings.length > 0) return "call";
  if (type.includes("call") || type.includes("voicemail")) return "call";
  return null;
}

function findSignedUrl(item: SpruceConversationItem, kind: "fax" | "call") {
  if (kind === "fax") {
    return item.signedUrl || item.attachments?.[0]?.signedUrl || "";
  }
  return item.recordings?.[0]?.signedUrl || "";
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
  // Reuses the practice's existing standing-alerts feed (the same one that
  // already renders a persistent banner + repeating chime on every EHR page
  // for new bookings and consultation requests) so this shows up the same
  // way, with no separate UI needed to make it visible.
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
  // Signature verification runs against the RAW body — read text() first,
  // never request.json() first, or the byte-for-byte comparison breaks.
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-spruce-signature");
  const secret = process.env.SPRUCE_WEBHOOK_SECRET || "";
  if (!verifySpruceSignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ error: "Invalid or missing webhook signature." }, { status: 401 });
  }

  let event: { type?: string; data?: SpruceConversationItem };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed webhook payload." }, { status: 400 });
  }

  if (event.type !== "conversationItem.created" || !event.data) {
    // Not a type we act on (e.g. a plain text message) — acknowledge and skip.
    return NextResponse.json({ received: true, handled: false });
  }

  const item = event.data;
  const kind = classifyItem(item);
  if (!kind) {
    return NextResponse.json({ received: true, handled: false });
  }

  const itemId = item.id || `unknown_${Date.now()}`;
  const fromNumber = extractSourceNumber(item);

  try {
    let signedUrl = findSignedUrl(item, kind);
    if (!signedUrl && item.id) {
      // Fallback: the webhook payload didn't carry a usable signedUrl —
      // re-fetch the conversationItem directly from the Spruce API.
      try {
        const refetched = await fetchSpruceConversationItem(item.id);
        signedUrl = findSignedUrl((refetched?.data || refetched) as SpruceConversationItem, kind);
      } catch {
        // Fall through — handled below by recording a needs-attention item.
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
        ? `New fax received${fromNumber ? ` from ${fromNumber}` : ""}. Saved securely — open the Spruce Inbox to view and link it to a client chart.`
        : `New call recording / voicemail received${fromNumber ? ` from ${fromNumber}` : ""}. Saved securely — open the Spruce Inbox to listen and link it to a client chart.`,
    });
    return NextResponse.json({ received: true, handled: true, stored: true });
  } catch (error) {
    // Never let a processing failure make an incoming fax or call vanish
    // without a trace — record what happened as a needs-attention alert so
    // the practice still finds out, even if the automated pickup failed.
    try {
      await recordInboxAlert({
        kind,
        itemId,
        fromNumber,
        storageKey: "",
        note: `A ${kind} arrived from Spruce but could not be saved automatically: ${error instanceof Error ? error.message : "unknown error"}. Check this conversation directly in Spruce (conversation ${item.conversationId || "unknown"}).`,
      });
    } catch {
      // If even the fallback alert fails, there is nothing further to do
      // here — respond 200 so Spruce does not retry indefinitely, and this
      // will surface the next time Amplify logs are reviewed.
    }
    return NextResponse.json({ received: true, handled: true, stored: false });
  }
}
