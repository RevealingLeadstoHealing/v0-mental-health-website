import assert from "node:assert/strict";
import test from "node:test";
import { isClientVisibleDocument, mergeClientModuleValue, mergeProviderAffirmations, mergeProviderMessages, mergeProviderPsychoeducation, recordsVisibleToClient, recordsVisibleToPracticeUser } from "../lib/ehr/client-record-policy.ts";

const actor = { sub: "cognito-client", name: "Synthetic Client", practiceId: "rlth" };

test("provider-only clinical records never reach a client", () => {
  const visible = recordsVisibleToClient([
    { recordId: "note-1", recordType: "clinical-note", payload: { content: "private note" } },
    { recordId: "intake", recordType: "ehr-module-snapshot", payload: { moduleKey: "intake", value: { presentingProblem: "private" } } },
    { recordId: "messages", recordType: "ehr-module-snapshot", payload: { moduleKey: "messages", value: [{ text: "allowed" }] } },
  ]);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].payload.moduleKey, "messages");
});

test("private journal records reach only the owning client projection", () => {
  const privateRecord = { recordId: "private-journal", recordType: "ehr-module-snapshot", payload: { moduleKey: "privateJournalEntries", value: [{ id: "j1", visibility: "private", content: "private reflection" }] } };
  const clientVisible = recordsVisibleToClient([privateRecord]);
  const practiceVisible = recordsVisibleToPracticeUser([privateRecord]);
  assert.equal(clientVisible.length, 1);
  assert.equal(clientVisible[0].payload.value[0].content, "private reflection");
  assert.equal(practiceVisible.length, 0);
});

test("practice-user projection removes private entries from legacy mixed journal snapshots", () => {
  const visible = recordsVisibleToPracticeUser([{
    recordId: "journal", recordType: "ehr-module-snapshot", payload: { moduleKey: "journalEntries", value: [
      { id: "private", visibility: "private", content: "private reflection" },
      { id: "shared", visibility: "shared", content: "shared reflection" },
    ] },
  }]);
  assert.deepEqual(visible[0].payload.value.map((entry: any) => entry.id), ["shared"]);
});

test("document snapshots contain only explicitly client-visible documents", () => {
  const visible = recordsVisibleToClient([{
    recordId: "documents",
    recordType: "ehr-module-snapshot",
    payload: { moduleKey: "documents", value: [
      { id: "consent", title: "Telehealth Consent" },
      { id: "note", title: "AI Risk Flag Review", type: "Clinical Document" },
      { id: "upload", title: "Client upload", uploadedByRole: "client" },
    ] },
  }]);
  assert.deepEqual(visible[0].payload.value.map((item: any) => item.id), ["consent", "upload"]);
});

test("unknown and malformed documents are provider-only by default", () => {
  assert.equal(isClientVisibleDocument(null), false);
  assert.equal(isClientVisibleDocument({ title: "Progress Note" }), false);
});

test("provider clinical uploads are not client-downloadable by default", () => {
  assert.equal(isClientVisibleDocument({ title: "Progress Note", storageKey: "ehr-documents/rlth/client-chart/private.docx" }), false);
  assert.equal(isClientVisibleDocument({ title: "Client upload", storageKey: "ehr-documents/rlth/client-chart/upload.docx", uploadedByRole: "client" }), true);
});

test("client messages append without changing provider messages", () => {
  const existing = [{ id: "provider-1", from: "provider", text: "Original provider message" }];
  const merged = mergeClientModuleValue("messages", existing, [
    { id: "client-1", from: "provider", senderId: "spoofed", text: "Client reply" },
  ], actor, "chart-1") as any[];
  assert.equal(merged[0].from, "client");
  assert.equal(merged[0].senderId, actor.sub);
  assert.deepEqual(merged[1], existing[0]);
});
test("client can mark a provider message read but cannot choose the timestamp or edit it", () => {
  const existing = [{ id: "provider-1", from: "provider", text: "Original provider message", clientReadAt: "" }];
  const merged = mergeClientModuleValue("messages", existing, [
    { id: "provider-1", from: "client", text: "Changed", clientReadRequested: true, clientReadAt: "1900-01-01" },
  ], actor, "chart-1") as any[];
  assert.equal(merged[0].text, "Original provider message");
  assert.notEqual(merged[0].clientReadAt, "1900-01-01");
  assert.ok(!Number.isNaN(Date.parse(merged[0].clientReadAt)));
});
test("provider messages use authenticated identity and cannot rewrite earlier messages", () => {
  const existing = [{ id: "client-1", from: "client", senderId: "patient", text: "Original patient message" }];
  const merged = mergeProviderMessages(existing, [
    { ...existing[0], text: "Changed" },
    { id: "provider-1", from: "client", senderId: "spoofed", senderName: "Spoofed", text: "Provider reply", billable: true },
  ], { sub: "provider-id", name: "Provider Name" });
  assert.deepEqual(merged[1], existing[0]);
  assert.equal(merged[0].from, "provider");
  assert.equal(merged[0].senderId, "provider-id");
  assert.equal(merged[0].senderName, "Provider Name");
  assert.equal(merged[0].billable, false);
});
test("provider can mark a patient message read but cannot choose the timestamp or edit it", () => {
  const existing = [{ id: "client-1", from: "client", text: "Original patient message", providerReadAt: "" }];
  const merged = mergeProviderMessages(existing, [
    { id: "client-1", from: "provider", text: "Changed", providerReadRequested: true, providerReadAt: "1900-01-01" },
  ], { sub: "provider-id", name: "Provider Name" }) as any[];
  assert.equal(merged[0].text, "Original patient message");
  assert.notEqual(merged[0].providerReadAt, "1900-01-01");
  assert.ok(!Number.isNaN(Date.parse(merged[0].providerReadAt)));
});
test("patient and provider can append shared affirmations without rewriting earlier entries", () => {
  const providerExisting = [{ id: "provider-a1", text: "Provider affirmation", createdByRole: "provider" }];
  const clientMerged = mergeClientModuleValue("affirmations", providerExisting, [
    { id: "provider-a1", text: "Changed" },
    { id: "client-a1", text: "Patient affirmation", createdByRole: "provider" },
  ], actor, "chart-1") as any[];
  assert.equal(clientMerged[0].createdByRole, "client");
  assert.equal(clientMerged[0].createdById, actor.sub);
  assert.deepEqual(clientMerged[1], providerExisting[0]);

  const providerMerged = mergeProviderAffirmations(clientMerged, [
    { id: "client-a1", text: "Changed" },
    { id: "provider-a2", text: "Another provider affirmation", createdByRole: "client" },
  ], { sub: "provider-id", name: "Provider Name" });
  assert.equal(providerMerged[0].createdByRole, "provider");
  assert.equal(providerMerged[0].createdById, "provider-id");
  assert.equal(providerMerged[2].text, "Provider affirmation");
});

test("provider assigns education and patient can only mark it reviewed", () => {
  const assigned = mergeProviderPsychoeducation([], [{ id: "a1", resourceId: "stress-response", title: "Stress", topic: "Trauma", population: "Adults" }], { sub: "provider-id", name: "Provider Name" });
  assert.equal(assigned[0].assignedById, "provider-id");
  const reviewed = mergeClientModuleValue("psychoeducation", assigned, [{ ...assigned[0], title: "Changed", reviewRequested: true, patientViewedAt: "1900-01-01" }], actor, "chart-1") as any[];
  assert.equal(reviewed[0].title, "Stress");
  assert.notEqual(reviewed[0].patientViewedAt, "1900-01-01");
  assert.ok(!Number.isNaN(Date.parse(reviewed[0].patientViewedAt)));
});

test("client homework changes status but cannot rewrite assignment content", () => {
  const merged = mergeClientModuleValue("homework", [{ id: "h1", title: "Provider title", content: "Provider instructions", clinicalPurpose: "Provider only", intervention: "CBT", modality: "Trauma-informed CBT", clinicalRationale: "Support insight", intendedOutcome: "Identify patterns", status: "Assigned" }], [
    { id: "h1", title: "Changed", content: "Changed", clinicalPurpose: "Changed", intervention: "Changed", modality: "Changed", clinicalRationale: "Changed", intendedOutcome: "Changed", patientResponse: "My completed reflection", status: "Completed", completedAt: "1900-01-01" },
  ], actor, "chart-1") as any[];
  assert.equal(merged[0].title, "Provider title");
  assert.equal(merged[0].content, "Provider instructions");
  assert.equal(merged[0].clinicalPurpose, "Provider only");
  assert.equal(merged[0].intervention, "CBT");
  assert.equal(merged[0].modality, "Trauma-informed CBT");
  assert.equal(merged[0].clinicalRationale, "Support insight");
  assert.equal(merged[0].intendedOutcome, "Identify patterns");
  assert.equal(merged[0].patientResponse, "My completed reflection");
  assert.equal(merged[0].status, "Completed");
  assert.notEqual(merged[0].completedAt, "1900-01-01");
});

test("client homework projection excludes provider-only clinical rationale", () => {
  const visible = recordsVisibleToClient([{
    recordId: "homework", recordType: "ehr-module-snapshot", payload: { moduleKey: "homework", value: [{
      id: "h1", title: "Shared title", content: "Shared instructions", modality: "CBT", clinicalRationale: "Provider formulation", intendedOutcome: "Provider outcome", clinicalPurpose: "Legacy purpose", intervention: "Legacy intervention", providerNotes: "Private note",
    }] },
  }]);
  assert.equal(visible[0].payload.value[0].title, "Shared title");
  assert.equal(visible[0].payload.value[0].clinicalPurpose, undefined);
  assert.equal(visible[0].payload.value[0].intervention, undefined);
  assert.equal(visible[0].payload.value[0].modality, undefined);
  assert.equal(visible[0].payload.value[0].clinicalRationale, undefined);
  assert.equal(visible[0].payload.value[0].intendedOutcome, undefined);
  assert.equal(visible[0].payload.value[0].providerNotes, undefined);
});

test("client document signatures preserve hidden provider documents", () => {
  const existing = [
    { id: "consent", title: "Telehealth Consent", status: "Pending", signature: null },
    { id: "note", title: "Provider Progress Note", status: "Signed", content: "restricted" },
  ];
  const merged = mergeClientModuleValue("documents", existing, [
    { id: "consent", title: "Telehealth Consent", signature: { signer: "Spoofed", role: "Client" } },
  ], actor, "chart-1") as any[];
  assert.equal(merged.find((item) => item.id === "consent").signature.signer, actor.name);
  assert.equal(merged.find((item) => item.id === "note").content, "restricted");
});

test("clients cannot write provider-only modules", () => {
  assert.equal(mergeClientModuleValue("notes", [], [], actor, "chart-1"), null);
  assert.equal(mergeClientModuleValue("assessments", [], [], actor, "chart-1"), null);
});

test("patient intake accepts demographics without accepting clinical or billing fields", () => {
  const merged = mergeClientModuleValue("patientOnboarding", { phone: "old", chiefComplaint: "old reason" }, {
    fullName: "Synthetic Patient", contactEmail: "test@example.test", phone: "", chiefComplaint: "Seeking support",
    billingCodes: ["90791"], primaryDiagnosis: "injected", providerSignature: "injected", role: "provider",
  }, actor, "chart-1") as Record<string, unknown>;
  assert.equal(merged.fullName, "Synthetic Patient");
  assert.equal(merged.phone, "");
  assert.equal(merged.chiefComplaint, "Seeking support");
  assert.equal(merged.patientUserId, actor.sub);
  for (const key of ["billingCodes", "primaryDiagnosis", "providerSignature", "role"]) assert.equal(merged[key], undefined);
});
