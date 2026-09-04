const CLIENT_DOCUMENT_TITLES = new Set([
  "Consent for Psychotherapy / Treatment",
  "Telehealth Consent",
  "Recording and AI Scribe Consent",
  "HIPAA Notice of Privacy Practices Acknowledgement",
  "Release of Information",
  "Communication Consent - Phone/Text/Email/Spruce",
  "Financial Responsibility / Billing Consent",
  "Emergency and Crisis Policy Acknowledgement",
  "Treatment Plan Signature",
]);

export const CLIENT_READABLE_MODULE_KEYS = new Set([
  "journalEntries",
  "homework",
  "messages",
  "appointments",
  "telehealth",
  "recordRequests",
  "documents",
  "patientOnboarding",
  "affirmations",
  "psychoeducation",
]);

export const CLIENT_WRITABLE_MODULE_KEYS = new Set([
  "journalEntries",
  "homework",
  "messages",
  "appointments",
  "recordRequests",
  "documents",
  "patientOnboarding",
  "affirmations",
  "psychoeducation",
]);

function arrayValue(value: unknown): Array<Record<string, any>> {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function byId(items: Array<Record<string, any>>) {
  return new Map(items.filter((item) => typeof item.id === "string").map((item) => [item.id, item]));
}

export function mergeProviderMessages(existingValue: unknown, submittedValue: unknown, actor: { sub: string; name: string }) {
  const existing = arrayValue(existingValue);
  const submitted = arrayValue(submittedValue);
  const submittedMap = byId(submitted);
  const existingIds = new Set(existing.map(item => item.id));
  const retained = existing.map((item) => {
    const update = submittedMap.get(item.id);
    if (item.from !== "client" || !update?.providerReadRequested) return item;
    return item.providerReadAt ? item : { ...item, providerReadAt: new Date().toISOString() };
  });
  const additions = submitted.filter(item => !existingIds.has(item.id)).map(item => ({
    id: String(item.id || `message-${Date.now()}`).slice(0, 200),
    billingCategory: "Non-billable communication",
    billable: false,
    appointmentId: String(item.appointmentId || "").slice(0, 200),
    from: "provider",
    senderId: actor.sub,
    senderName: actor.name,
    text: String(item.text || "").trim().slice(0, 10000),
    timestamp: new Date().toISOString(),
    clientReadAt: "",
  })).filter(item => item.text);
  return [...additions, ...retained];
}

export function mergeProviderAffirmations(existingValue: unknown, submittedValue: unknown, actor: { sub: string; name: string }) {
  const existing = arrayValue(existingValue);
  const existingIds = new Set(existing.map(item => item.id));
  const additions = arrayValue(submittedValue).filter(item => !existingIds.has(item.id)).map(item => ({
    id: String(item.id || `affirmation-${Date.now()}`).slice(0, 200),
    text: String(item.text || "").trim().slice(0, 1000),
    createdByRole: "provider",
    createdById: actor.sub,
    createdByName: actor.name,
    createdAt: new Date().toISOString(),
    visibility: "shared",
  })).filter(item => item.text);
  return [...additions, ...existing];
}

export function mergeProviderPsychoeducation(existingValue: unknown, submittedValue: unknown, actor: { sub: string; name: string }) {
  const existing = arrayValue(existingValue);
  const existingIds = new Set(existing.map(item => item.id));
  const additions = arrayValue(submittedValue).filter(item => !existingIds.has(item.id)).map(item => ({
    id: String(item.id || `education-${Date.now()}`).slice(0, 200),
    resourceId: String(item.resourceId || "").slice(0, 200),
    title: String(item.title || "Psychoeducation resource").slice(0, 300),
    topic: String(item.topic || "General").slice(0, 100),
    population: String(item.population || "All ages").slice(0, 100),
    assignedAt: new Date().toISOString(),
    assignedById: actor.sub,
    assignedByName: actor.name,
    patientViewedAt: "",
  })).filter(item => item.resourceId);
  return [...additions, ...existing];
}

export function mergeClientModuleValue(
  moduleKey: string,
  existingValue: unknown,
  submittedValue: unknown,
  actor: { sub: string; name: string; practiceId: string },
  clientId: string,
) {
  if (!CLIENT_WRITABLE_MODULE_KEYS.has(moduleKey)) return null;
  const existing = arrayValue(existingValue);
  const submitted = arrayValue(submittedValue);
  const existingMap = byId(existing);

  if (moduleKey === "messages") {
    const submittedMap = byId(submitted);
    const retained = existing.map((item) => {
      const update = submittedMap.get(item.id);
      if (item.from !== "provider" || !update?.clientReadRequested) return item;
      return item.clientReadAt ? item : { ...item, clientReadAt: new Date().toISOString() };
    });
    const additions = submitted.filter((item) => !existingMap.has(item.id)).map((item) => ({
      id: String(item.id || `message-${Date.now()}`),
      from: "client",
      senderId: actor.sub,
      senderName: actor.name,
      text: String(item.text || "").trim().slice(0, 10000),
      timestamp: new Date().toISOString(),
    })).filter((item) => item.text);
    return [...additions, ...retained];
  }

  if (moduleKey === "affirmations") {
    const additions = submitted.filter(item => !existingMap.has(item.id)).map(item => ({
      id: String(item.id || `affirmation-${Date.now()}`).slice(0, 200),
      text: String(item.text || "").trim().slice(0, 1000),
      createdByRole: "client",
      createdById: actor.sub,
      createdByName: actor.name,
      createdAt: new Date().toISOString(),
      visibility: "shared",
    })).filter(item => item.text);
    return [...additions, ...existing];
  }

  if (moduleKey === "psychoeducation") {
    const submittedMap = byId(submitted);
    return existing.map(item => {
      const update = submittedMap.get(item.id);
      if (!update?.reviewRequested || item.patientViewedAt) return item;
      return { ...item, patientViewedAt: new Date().toISOString() };
    });
  }

  if (moduleKey === "homework") {
    const submittedMap = byId(submitted);
    return existing.map((item) => {
      const update = submittedMap.get(item.id);
      const status = ["Assigned", "In Progress", "Completed"].includes(update?.status) ? update.status : item.status;
      const wasCompleted = item.status === "Completed";
      return {
        ...item,
        status,
        patientResponse: String(update?.patientResponse ?? item.patientResponse ?? "").slice(0, 50000),
        startedAt: status === "In Progress" || status === "Completed" ? String(item.startedAt || new Date().toISOString()) : "",
        completedAt: status === "Completed" ? String(wasCompleted ? item.completedAt : new Date().toISOString()) : "",
        submittedForReviewAt: status === "Completed" ? String(wasCompleted ? item.submittedForReviewAt : new Date().toISOString()) : "",
      };
    });
  }

  if (moduleKey === "appointments") {
    const submittedMap = byId(submitted);
    const retained = existing.map((item) => {
      const update = submittedMap.get(item.id);
      return { ...item, status: update?.status === "Cancelled" ? "Cancelled" : item.status };
    });
    const additions = submitted.filter((item) => !existingMap.has(item.id)).map((item) => ({
      id: String(item.id || `appt-${Date.now()}`),
      date: String(item.date || "").slice(0, 10),
      time: String(item.time || "").slice(0, 8),
      format: ["Telehealth", "In Person", "Phone"].includes(item.format) ? item.format : "Telehealth",
      purpose: String(item.purpose || "Appointment").slice(0, 200),
      status: "Scheduled",
      createdAt: new Date().toISOString(),
      createdByRole: "client",
    })).filter((item) => item.date && item.time);
    return [...additions, ...retained];
  }

  if (moduleKey === "recordRequests") {
    const additions = submitted.filter((item) => !existingMap.has(item.id)).map((item) => ({
      id: String(item.id || `request-${Date.now()}`),
      clientId,
      clientName: actor.name,
      requestType: ["Medical Record Copy", "Treatment Plan Request", "Progress Note Request"].includes(item.requestType) ? item.requestType : "Medical Record Copy",
      reason: String(item.reason || "No additional details provided.").slice(0, 5000),
      status: "Pending Review",
      submittedAt: new Date().toISOString(),
      resolvedAt: "",
    }));
    return [...additions, ...existing];
  }

  if (moduleKey === "patientOnboarding") {
    const existing = existingValue && typeof existingValue === "object"
      ? existingValue as Record<string, unknown>
      : {};
    const submitted = submittedValue && typeof submittedValue === "object"
      ? submittedValue as Record<string, unknown>
      : {};
    const allowed = [
      "fullName", "dateOfBirth", "contactEmail", "addressLine1", "addressLine2", "city", "state", "zipCode",
      "phone", "chiefComplaint", "presentingProblem", "treatmentGoals",
      "insurancePayer", "insuranceMemberId", "insuranceGroupNumber",
    ] as const;
    const safeFields = Object.fromEntries(
      allowed.map((field) => [field, String(submitted[field] ?? existing[field] ?? "").slice(0, 5000)])
    );
    return {
      ...safeFields,
      onboardingStatus: "Submitted for provider review",
      patientSubmittedAt: new Date().toISOString(),
      patientUserId: actor.sub,
    };
  }

  if (moduleKey === "documents") {
    const submittedMap = byId(submitted);
    const retained = existing.map((item) => {
      if (!isClientVisibleDocument(item)) return item;
      const update = submittedMap.get(item.id);
      if (!update) return item;
      const alreadySigned = [item.signature, ...(Array.isArray(item.signatures) ? item.signatures : [])].find(entry => entry && (entry.role === 'Client' || entry.authenticatedRole === 'client') && entry.signedAt);
      const requestsClientSignature = update.signature && typeof update.signature === 'object' && (update.signature.role === 'Client' || update.signature.authenticatedRole === 'client');
      const clientSignature = alreadySigned || (requestsClientSignature
        ? { signer: actor.name, signerId: actor.sub, authenticatedRole: 'client', role: "Client", signedAt: new Date().toISOString() }
        : item.signature);
      return { ...item, viewedAt: String(update.viewedAt || item.viewedAt || ""), signature: clientSignature, status: clientSignature ? "Signed" : item.status };
    });
    const prefix = `ehr-documents/${actor.practiceId}/client-${clientId.replace(/[^a-zA-Z0-9._-]/g, "_")}/`;
    const uploads = submitted.filter((item) => !existingMap.has(item.id) && typeof item.storageKey === "string" && item.storageKey.startsWith(prefix)).map((item) => ({
      ...item,
      title: String(item.title || "Client document").slice(0, 200),
      type: ["Clinical Document", "Assessment", "Consent", "Signed Form"].includes(item.type) ? item.type : "Clinical Document",
      status: "Uploaded",
      signature: null,
      signatures: [],
      uploadedByRole: "client",
      clientVisible: true,
    }));
    return [...uploads, ...retained];
  }

  if (moduleKey === "journalEntries") {
    return submitted.map((item) => ({
      id: String(item.id || `journal-${Date.now()}`),
      title: String(item.title || "Journal entry").slice(0, 200),
      content: String(item.content || "").slice(0, 50000),
      visibility: item.visibility === "shared" ? "shared" : "private",
      createdAt: String(item.createdAt || new Date().toISOString()),
      updatedAt: new Date().toISOString(),
      createdByRole: "client",
    })).filter((item) => item.content);
  }

  return null;
}

export function isClientVisibleDocument(document: unknown) {
  if (!document || typeof document !== "object") return false;
  const item = document as Record<string, unknown>;
  if (item.clientVisible === true || item.uploadedByRole === "client") return true;
  return typeof item.title === "string" && CLIENT_DOCUMENT_TITLES.has(item.title);
}

function publicRecordProjection(record: Record<string, any>) {
  return {
    recordId: record.recordId,
    recordType: record.recordType,
    clientId: record.clientId,
    status: record.status,
    payload: record.payload,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function recordsVisibleToClient(records: unknown[]) {
  return records.flatMap((rawRecord) => {
    if (!rawRecord || typeof rawRecord !== "object") return [];
    const record = rawRecord as Record<string, any>;
    if (record.recordType !== "ehr-module-snapshot") return [];
    const moduleKey = record.payload?.moduleKey;
    if (typeof moduleKey !== "string" || (!CLIENT_READABLE_MODULE_KEYS.has(moduleKey) && moduleKey !== "privateJournalEntries")) return [];
    if (moduleKey === "homework") {
      const assignments = Array.isArray(record.payload?.value) ? record.payload.value.map((item: Record<string, any>) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        dueDate: item.dueDate,
        status: item.status,
        assignedAt: item.assignedAt,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        patientResponse: item.patientResponse,
        providerFeedback: item.providerFeedback,
        providerReviewedAt: item.providerReviewedAt,
      })) : [];
      return [publicRecordProjection({ ...record, payload: { ...record.payload, value: assignments } })];
    }
    if (moduleKey !== "documents") return [publicRecordProjection(record)];

    const documents = Array.isArray(record.payload?.value)
      ? record.payload.value.filter(isClientVisibleDocument)
      : [];
    return [publicRecordProjection({
      ...record,
      payload: { ...record.payload, value: documents },
    })];
  });
}

export function recordsVisibleToPracticeUser(records: unknown[]) {
  return records.flatMap((rawRecord) => {
    if (!rawRecord || typeof rawRecord !== "object") return [];
    const record = rawRecord as Record<string, any>;
    const moduleKey = record.recordType === "ehr-module-snapshot" ? record.payload?.moduleKey : "";
    if (moduleKey === "privateJournalEntries") return [];
    if (moduleKey !== "journalEntries") return [record];

    const sharedEntries = Array.isArray(record.payload?.value)
      ? record.payload.value.filter((entry: Record<string, any>) => entry?.visibility === "shared")
      : [];
    return [{
      ...record,
      payload: { ...record.payload, value: sharedEntries },
    }];
  });
}
