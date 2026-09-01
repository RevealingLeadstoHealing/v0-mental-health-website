import { randomUUID } from "node:crypto";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../../lib/ehr/auth";
import { requireClientAccess } from "../../../../../lib/ehr/authorization";
import { appendAuditEvent, getSavedScribeJob, putClinicalRecord } from "../../../../../lib/ehr/dynamodb-store";
import { resolveScribeJobBinding } from "../../../../../lib/ehr/scribe-job-binding";
import { getHealthScribeJob, healthScribeBucket, healthScribeS3, readS3Json, startHealthScribeJob } from "../../../../../lib/ehr/healthscribe";

const templates = new Set(["GIRPP", "BIRP", "SIRP", "DAP", "BEHAVIORAL_SOAP"]);

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);
    const body = await request.json();
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const mediaKey = typeof body.mediaKey === "string" ? body.mediaKey : "";
    const noteTemplate = typeof body.noteTemplate === "string" ? body.noteTemplate.toUpperCase() : "BEHAVIORAL_SOAP";
    if (!clientId || !mediaKey) throw new ApiError(400, "clientId and mediaKey are required.");
    if (body.consentConfirmed !== true) throw new ApiError(400, "Recording and AI-scribe consent must be confirmed.");
    if (!templates.has(noteTemplate)) throw new ApiError(400, "Unsupported behavioral-health note template.");
    if (!mediaKey.startsWith(`temporary-audio/${actor.practiceId}/${clientId}/`)) throw new ApiError(403, "Audio key does not belong to this chart.");
    await requireClientAccess(actor, clientId);
    const jobName = `rlth-${actor.practiceId}-${clientId}-${randomUUID()}`.replace(/[^0-9A-Za-z._-]/g, "-").slice(0, 190);
    // Persist the chart binding before starting AWS work so a lost response cannot orphan ownership.
    const savedJob = { clientId, recordId: jobName, recordType: "healthscribe-job", payload: { jobName, mediaKey, noteTemplate, providerReviewRequired: true } };
    await putClinicalRecord(actor, { ...savedJob, status: "requested" });
    await startHealthScribeJob({ jobName, mediaKey, noteTemplate: noteTemplate as "GIRPP" | "BIRP" | "SIRP" | "DAP" | "BEHAVIORAL_SOAP", practiceId: actor.practiceId, clientId });
    await putClinicalRecord(actor, { ...savedJob, status: "in-progress" });
    await appendAuditEvent(actor, { action: "Started AWS HealthScribe job", category: "AI Scribe", clientId, entityType: "healthscribe-job", entityId: jobName, summary: `Behavioral-health ${noteTemplate} preliminary documentation job started.` });
    return NextResponse.json({ jobName, status: "IN_PROGRESS" }, { status: 202 });
  } catch (error) { return apiErrorResponse(error); }
}

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") || "";
    const jobName = url.searchParams.get("jobName") || "";
    if (!clientId || !jobName) throw new ApiError(400, "clientId and jobName are required.");
    await requireClientAccess(actor, clientId);
    const record = await getSavedScribeJob(actor.practiceId, clientId, jobName);
    const binding = resolveScribeJobBinding(record, actor.practiceId, clientId, jobName);
    if (!binding) throw new ApiError(403, "Scribe job does not have a verified link to this chart.");
    const response = await getHealthScribeJob(jobName);
    const job = response.MedicalScribeJob;
    const status = job?.MedicalScribeJobStatus || "UNKNOWN";
    if (status !== "COMPLETED") return NextResponse.json({ status, failureReason: job?.FailureReason || "" });
    const [transcript, clinicalDocument] = await Promise.all([
      readS3Json(job?.MedicalScribeOutput?.TranscriptFileUri),
      readS3Json(job?.MedicalScribeOutput?.ClinicalDocumentUri),
    ]);
    await healthScribeS3.send(new DeleteObjectCommand({ Bucket: healthScribeBucket, Key: binding.mediaKey }));
    await appendAuditEvent(actor, { action: "Retrieved AWS HealthScribe draft and deleted temporary audio", category: "AI Scribe", clientId, entityType: "healthscribe-job", entityId: jobName, summary: "Preliminary documentation was retrieved for provider review; the temporary source audio was deleted." });
    return NextResponse.json({ status, transcript, clinicalDocument, providerReviewRequired: true, temporaryAudioDeleted: true });
  } catch (error) { return apiErrorResponse(error); }
}
