import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { appendAuditEvent, getClinicalRecord, listClinicalRecords, putClinicalRecord } from "../../../../lib/ehr/dynamodb-store";
import { requireClientAccess } from "../../../../lib/ehr/authorization";
import { mergeClientModuleValue, mergeProviderAffirmations, mergeProviderMessages, mergeProviderPsychoeducation, recordsVisibleToClient, recordsVisibleToPracticeUser } from "../../../../lib/ehr/client-record-policy";
import { preserveSignedDocuments } from "../../../../lib/ehr/signed-documents";

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") || actor.sub;
    const limit = Number(url.searchParams.get("limit") || "50");

    requireRole(actor, ["owner", "provider", "clinical_staff", "client", "auditor"]);
    await requireClientAccess(actor, clientId);

    const chartRecords = await listClinicalRecords(actor.practiceId, clientId, limit);
    const records = actor.role === "client" ? recordsVisibleToClient(chartRecords) : recordsVisibleToPracticeUser(chartRecords);
    await appendAuditEvent(actor, {
      action: "Viewed clinical record list",
      category: "Clinical Record Access",
      clientId,
      entityType: "clinical-record-list",
      summary: "Clinical record list was accessed through the production API.",
    });

    return NextResponse.json({ records });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    const body = await request.json();
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const recordType = typeof body.recordType === "string" ? body.recordType : "clinical-note";
    let payload = body.payload && typeof body.payload === "object" ? body.payload : null;

    if (!clientId) {
      throw new ApiError(400, "clientId is required.");
    }

    if (!payload) {
      throw new ApiError(400, "payload is required.");
    }

    await requireClientAccess(actor, clientId);

    const moduleKey = recordType === "ehr-module-snapshot" && typeof payload.moduleKey === "string"
      ? payload.moduleKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)
      : "";
    if (recordType === "ehr-module-snapshot" && !moduleKey) {
      throw new ApiError(400, "A valid moduleKey is required for an EHR module snapshot.");
    }

    let newlyReadByClientCount = 0;
    let newlyReadByProviderCount = 0;
    let privateJournalEntriesPending: Array<Record<string, any>> | null = null;
    if (actor.role === "client") {
      if (recordType !== "ehr-module-snapshot") throw new ApiError(403, "Client accounts may use only authorized portal actions.");
      const existing = await getClinicalRecord(actor.practiceId, clientId, recordType, `module_${moduleKey}`);
      const existingPrivateJournal = moduleKey === "journalEntries"
        ? await getClinicalRecord(actor.practiceId, clientId, recordType, "module_privateJournalEntries")
        : null;
      const existingValue = moduleKey === "journalEntries"
        ? [...(Array.isArray(existing?.payload?.value) ? existing.payload.value : []), ...(Array.isArray(existingPrivateJournal?.payload?.value) ? existingPrivateJournal.payload.value : [])]
        : existing?.payload?.value;
      const mergedValue = mergeClientModuleValue(moduleKey, existingValue, payload.value, actor, clientId);
      if (!mergedValue) throw new ApiError(403, "This client portal action is not authorized.");
      if (moduleKey === "messages") {
        const before = Array.isArray(existing?.payload?.value) ? existing.payload.value : [];
        newlyReadByClientCount = Array.isArray(mergedValue)
          ? mergedValue.filter((message: any) => message.from === "provider" && message.clientReadAt && !before.find((item: any) => item.id === message.id)?.clientReadAt).length
          : 0;
      }
      if (moduleKey === "journalEntries" && Array.isArray(mergedValue)) {
        privateJournalEntriesPending = mergedValue.filter((entry: any) => entry.visibility !== "shared");
        payload = { moduleKey, value: mergedValue.filter((entry: any) => entry.visibility === "shared"), providerReviewRequired: true };
      } else {
        payload = { moduleKey, value: mergedValue, providerReviewRequired: true };
      }
    } else {
      requireRole(actor, ["owner", "provider", "clinical_staff"]);
      if (moduleKey === "messages") {
        const existing = await getClinicalRecord(actor.practiceId, clientId, recordType, `module_${moduleKey}`);
        const before = Array.isArray(existing?.payload?.value) ? existing.payload.value : [];
        const mergedValue = mergeProviderMessages(existing?.payload?.value, payload.value, actor);
        newlyReadByProviderCount = mergedValue.filter((message: any) => message.from === "client" && message.providerReadAt && !before.find((item: any) => item.id === message.id)?.providerReadAt).length;
        payload = { moduleKey, value: mergedValue, providerReviewRequired: true };
      } else if (moduleKey === "affirmations") {
        const existing = await getClinicalRecord(actor.practiceId, clientId, recordType, `module_${moduleKey}`);
        payload = { moduleKey, value: mergeProviderAffirmations(existing?.payload?.value, payload.value, actor), providerReviewRequired: false };
      } else if (moduleKey === "psychoeducation") {
        const existing = await getClinicalRecord(actor.practiceId, clientId, recordType, `module_${moduleKey}`);
        payload = { moduleKey, value: mergeProviderPsychoeducation(existing?.payload?.value, payload.value, actor), providerReviewRequired: false };
      }
    }

    if (moduleKey === 'documents') {
      const previous = await getClinicalRecord(actor.practiceId, clientId, recordType, 'module_documents');
      await preserveSignedDocuments(actor.practiceId, clientId, previous?.payload?.value);
      if (actor.role === 'client') await preserveSignedDocuments(actor.practiceId, clientId, payload.value);
    }
    const record = await putClinicalRecord(actor, {
      clientId,
      recordType,
      recordId: moduleKey ? `module_${moduleKey}` : undefined,
      payload,
      status: typeof body.status === "string" ? body.status : "draft",
    });
    if (privateJournalEntriesPending) {
      await putClinicalRecord(actor, {
        clientId,
        recordType: "ehr-module-snapshot",
        recordId: "module_privateJournalEntries",
        payload: { moduleKey: "privateJournalEntries", value: privateJournalEntriesPending, providerReviewRequired: false },
        status: "draft",
      });
    }

    await appendAuditEvent(actor, {
      action: "Created clinical record",
      category: "Clinical Documentation",
      clientId,
      entityType: recordType,
      entityId: record.recordId,
      summary: moduleKey ? `${moduleKey} was saved to the encrypted client chart.` : "A clinical record was created through the production API.",
    });
    if (newlyReadByClientCount) await appendAuditEvent(actor, {
      action: "Marked secure portal message read", category: "Non-billable communication",
      clientId, entityType: "secure-message",
      summary: `${newlyReadByClientCount} provider message(s) were viewed in the authenticated patient portal. Message text was not copied to this audit event.`,
    });
    if (newlyReadByProviderCount) await appendAuditEvent(actor, {
      action: "Marked patient portal message read", category: "Non-billable communication",
      clientId, entityType: "secure-message",
      summary: `${newlyReadByProviderCount} patient message(s) were viewed by an authenticated practice user. Message text was not copied to this audit event.`,
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
