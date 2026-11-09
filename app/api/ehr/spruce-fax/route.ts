import { GetObjectCommand } from "@aws-sdk/client-s3";
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { requireClientAccess } from "../../../../lib/ehr/authorization";
import { appendAuditEvent, listDocumentMetadata } from "../../../../lib/ehr/dynamodb-store";
import { getDynamoDocumentClient, getS3Client } from "../../../../lib/ehr/aws-runtime";
import { MAX_SERVER_UPLOAD_BYTES, safeSegment } from "../../../../lib/ehr/document-storage";
import {
  buildFaxMessageText,
  cleanCoverNote,
  isPdfBytes,
  maskFaxNumber,
  normalizeUsFaxNumber,
  parseFaxSendMode,
  pdfTitle,
  spruceIdempotencyKey,
  validateFaxSend,
} from "../../../../lib/ehr/outbound-fax";
import { rlthAwsFoundation } from "../../../../lib/rlth-aws-foundation";
import { resolveSpruceFaxEndpointId, sendSpruceFax, uploadSpruceMedia } from "../../../../lib/spruce/api-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Outbound fax through Spruce. Provider-only. SPRUCE_FAX_SEND_MODE controls
// behavior: "off" (default when unset/unrecognized) rejects sends; "dry-run"
// validates, records and audits but makes NO Spruce call; "live" uploads the
// PDF to Spruce and sends it from the practice fax line.
//
// Each confirmed send carries a client-generated token. The DynamoDB record is
// created with a condition on that token (a double click cannot send twice)
// and the same token seeds Spruce's s-idempotency-key.
//
// Neither the full fax number, the cover note, nor document contents are
// logged or placed in audit summaries; only the last four digits are stored.
// ---------------------------------------------------------------------------

type OutboundFaxRow = {
  faxId?: string;
  createdAt?: string;
  completedAt?: string;
  status?: string;
  mode?: string;
  destinationMasked?: string;
  source?: string;
  clientId?: string;
  sentBy?: string;
  sentByName?: string;
  hasCoverNote?: boolean;
  spruceRequestId?: string;
};

function outboundPartitionKey(practiceId: string) {
  return `PRACTICE#${practiceId}#SPRUCE_OUTBOUND_FAX`;
}

function currentMode() {
  return parseFaxSendMode(process.env.SPRUCE_FAX_SEND_MODE);
}

async function loadChartDocument(
  actor: { practiceId: string },
  clientId: string,
  documentId: string
): Promise<{ bytes: Uint8Array; title: string }> {
  const documents = await listDocumentMetadata(clientId, 100);
  const document = documents.find((entry) => entry.documentId === documentId) as
    | { storageKey?: string; title?: string; accessLevel?: string; practiceId?: string }
    | undefined;
  if (!document) throw new ApiError(404, "That chart document was not found.");
  if (document.practiceId !== actor.practiceId) throw new ApiError(409, "That document does not belong to this practice.");
  if (document.accessLevel === "restricted_psychotherapy_note") {
    throw new ApiError(403, "Restricted psychotherapy notes cannot be faxed from here.");
  }
  const key = document.storageKey || "";
  const expectedPrefix = `ehr-documents/${actor.practiceId}/client-${safeSegment(clientId)}/`;
  if (!key.startsWith(expectedPrefix) || !/\.pdf$/i.test(key)) {
    throw new ApiError(409, "Only PDF documents stored in this client's chart can be faxed.");
  }
  const source = await getS3Client().send(
    new GetObjectCommand({ Bucket: rlthAwsFoundation.documentsBucketName, Key: key })
  );
  const bytes = source.Body ? await source.Body.transformToByteArray() : undefined;
  if (!bytes || bytes.length === 0) throw new ApiError(409, "The stored file for that document could not be read.");
  return { bytes, title: document.title || "document.pdf" };
}

// ---------------------------------------------------------------------------
// GET — current send mode and sent-fax history; with ?clientId= also lists the
// PDF documents in that client's chart that can be chosen for faxing.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);

    const clientId = new URL(request.url).searchParams.get("clientId") || "";
    if (clientId) {
      await requireClientAccess(actor, clientId);
      const prefix = `ehr-documents/${actor.practiceId}/client-${safeSegment(clientId)}/`;
      const documents = (await listDocumentMetadata(clientId, 100))
        .filter((entry) => {
          const key = String(entry.storageKey || "");
          return key.startsWith(prefix) && /\.pdf$/i.test(key) && entry.accessLevel !== "restricted_psychotherapy_note";
        })
        .map((entry) => ({ documentId: String(entry.documentId), title: String(entry.title || "Untitled"), createdAt: String(entry.createdAt || "") }));
      return NextResponse.json({ documents });
    }

    const response = await getDynamoDocumentClient().send(
      new QueryCommand({
        TableName: rlthAwsFoundation.clinicalRecordsTableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": outboundPartitionKey(actor.practiceId), ":prefix": "FAX#" },
        Limit: 100,
      })
    );
    const items = ((response.Items || []) as OutboundFaxRow[])
      .map((row) => ({
        faxId: row.faxId || "",
        createdAt: row.createdAt || "",
        completedAt: row.completedAt || "",
        status: row.status || "pending",
        mode: row.mode || "",
        destinationMasked: row.destinationMasked || "",
        source: row.source || "",
        clientId: row.clientId || "",
        sentByName: row.sentByName || "",
        hasCoverNote: Boolean(row.hasCoverNote),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ mode: currentMode(), items });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// POST (multipart/form-data) — validate, record, audit, and (live only) send.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);

    const mode = currentMode();
    if (mode === "off") {
      throw new ApiError(403, "Fax sending is turned off for this practice.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "The fax request could not be read.");
    }

    const faxNumberRaw = form.get("faxNumber");
    const destination = normalizeUsFaxNumber(faxNumberRaw);
    const coverNote = cleanCoverNote(form.get("coverNote"));
    const sendToken = form.get("sendToken");
    const authorizationConfirmed = form.get("authorizationConfirmed") === "true";
    const source = form.get("source") === "chart" ? "chart" : "upload";
    const clientId = typeof form.get("clientId") === "string" ? (form.get("clientId") as string) : "";
    const documentId = typeof form.get("documentId") === "string" ? (form.get("documentId") as string) : "";

    // Read the PDF (uploaded or from a chart the provider is assigned to).
    let pdf: { bytes: Uint8Array; title: string } | undefined;
    if (source === "chart") {
      if (!clientId || !documentId) throw new ApiError(400, "Choose a client chart and a document.");
      await requireClientAccess(actor, clientId);
      pdf = await loadChartDocument(actor, clientId, documentId);
    } else {
      const file = form.get("file");
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const upload = file as File;
        if (upload.size > MAX_SERVER_UPLOAD_BYTES) throw new ApiError(413, "That PDF is larger than 4 MB. Choose a smaller file.");
        pdf = { bytes: new Uint8Array(await upload.arrayBuffer()), title: pdfTitle(upload.name) };
      }
    }
    if (pdf && !isPdfBytes(pdf.bytes)) throw new ApiError(400, "The attached file is not a PDF.");
    if (pdf && pdf.bytes.length > MAX_SERVER_UPLOAD_BYTES) throw new ApiError(413, "That PDF is larger than 4 MB. Choose a smaller file.");

    const problems = validateFaxSend({ faxNumber: faxNumberRaw, authorizationConfirmed, sendToken, hasPdf: Boolean(pdf) });
    if (problems.length > 0 || !pdf || !destination || typeof sendToken !== "string") {
      throw new ApiError(400, problems.join(" ") || "The fax request is incomplete.");
    }

    const faxId = sendToken;
    const createdAt = new Date().toISOString();
    const dynamo = getDynamoDocumentClient();
    const key = { PK: outboundPartitionKey(actor.practiceId), SK: `FAX#${faxId}` };
    const auditClientId = source === "chart" ? clientId : undefined;

    // One record per confirmed send; a repeated token is a double submit.
    try {
      await dynamo.send(
        new PutCommand({
          TableName: rlthAwsFoundation.clinicalRecordsTableName,
          Item: {
            ...key,
            recordType: "spruce-outbound-fax",
            faxId,
            practiceId: actor.practiceId,
            status: "pending",
            mode,
            destinationMasked: maskFaxNumber(destination),
            source,
            clientId: auditClientId || "",
            hasCoverNote: Boolean(coverNote),
            sentBy: actor.sub,
            sentByName: actor.name,
            authorizationConfirmedAt: createdAt,
            createdAt,
          },
          ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        })
      );
    } catch (error) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
        throw new ApiError(409, "This fax was already submitted. Check the sent history.");
      }
      throw error;
    }

    await appendAuditEvent(actor, {
      action: "Fax send requested",
      category: "Fax",
      clientId: auditClientId,
      entityType: "spruce-outbound-fax",
      entityId: faxId,
      summary: `Outbound fax requested (${mode}) to a number ending ${maskFaxNumber(destination).slice(-4)} with disclosure authorization confirmed.`,
    });

    const finish = async (status: string, spruceRequestId = "") => {
      await dynamo.send(
        new UpdateCommand({
          TableName: rlthAwsFoundation.clinicalRecordsTableName,
          Key: key,
          UpdateExpression: "SET #status = :status, completedAt = :completedAt, spruceRequestId = :requestId",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":status": status, ":completedAt": new Date().toISOString(), ":requestId": spruceRequestId },
        })
      );
    };

    if (mode === "dry-run") {
      console.info(JSON.stringify({ event: "spruce-fax-send", mode, status: "dry-run", source, bytes: pdf.bytes.length, faxId }));
      await finish("dry-run");
      await appendAuditEvent(actor, {
        action: "Fax send dry run recorded",
        category: "Fax",
        clientId: auditClientId,
        entityType: "spruce-outbound-fax",
        entityId: faxId,
        summary: "Dry run only. Nothing was uploaded to or sent through Spruce.",
      });
      return NextResponse.json({ faxId, status: "dry-run", mode });
    }

    try {
      const endpointId = await resolveSpruceFaxEndpointId();
      const attachmentId = await uploadSpruceMedia(pdf.bytes, pdf.title);
      const result = await sendSpruceFax({
        internalEndpointId: endpointId,
        destinationE164: destination,
        messageText: buildFaxMessageText(coverNote),
        attachmentId,
        attachmentTitle: pdf.title,
        idempotencyKey: spruceIdempotencyKey(actor.practiceId, faxId),
      });
      console.info(JSON.stringify({ event: "spruce-fax-send", mode, status: "accepted", source, bytes: pdf.bytes.length, faxId }));
      await finish("accepted", result.requestId);
      await appendAuditEvent(actor, {
        action: "Fax send accepted by Spruce",
        category: "Fax",
        clientId: auditClientId,
        entityType: "spruce-outbound-fax",
        entityId: faxId,
        summary: "Spruce accepted the outbound fax for delivery. Final delivery is not confirmed by Spruce's API.",
      });
      return NextResponse.json({ faxId, status: "accepted", mode });
    } catch (error) {
      console.error(JSON.stringify({ event: "spruce-fax-send", mode, status: "failed", faxId, reason: error instanceof Error ? error.message : "unknown" }));
      await finish("failed");
      await appendAuditEvent(actor, {
        action: "Fax send failed",
        category: "Fax",
        clientId: auditClientId,
        entityType: "spruce-outbound-fax",
        entityId: faxId,
        summary: "The outbound fax could not be sent through Spruce.",
      });
      throw new ApiError(502, "Spruce could not send the fax. Nothing was delivered. Try again later or send it from Spruce.");
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
