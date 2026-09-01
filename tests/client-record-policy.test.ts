import assert from "node:assert/strict";
import test from "node:test";
import { isClientVisibleDocument, mergeClientModuleValue, recordsVisibleToClient } from "../lib/ehr/client-record-policy.ts";

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

test("client homework changes status but cannot rewrite assignment content", () => {
  const merged = mergeClientModuleValue("homework", [{ id: "h1", title: "Provider title", content: "Provider instructions", status: "Assigned" }], [
    { id: "h1", title: "Changed", content: "Changed", status: "Completed" },
  ], actor, "chart-1") as any[];
  assert.equal(merged[0].title, "Provider title");
  assert.equal(merged[0].content, "Provider instructions");
  assert.equal(merged[0].status, "Completed");
});

test("client document signatures preserve hidden provider documents", () => {
  const existing = [
    { id: "consent", title: "Telehealth Consent", status: "Pending", signature: null },
    { id: "note", title: "Provider Progress Note", status: "Signed", content: "restricted" },
  ];
  const merged = mergeClientModuleValue("documents", existing, [
    { id: "consent", title: "Telehealth Consent", signature: { signer: "Spoofed" } },
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
