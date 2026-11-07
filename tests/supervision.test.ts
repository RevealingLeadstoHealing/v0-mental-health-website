import test from "node:test";
import assert from "node:assert/strict";
import {
  canAdministerSupervision,
  superviseeTargetProblem,
  canSupervise,
  claimSupervisionState,
  findIllegalFinalization,
  nextSupervisionStatus,
  reconcileSupervisedNotes,
  requireReturnComment,
  sanitizeSupervisedContent,
  supervisionAttribution,
  supervisionStatusLabel,
  validateSupervisedSubmission,
  withSupervisionStatus,
} from "../lib/ehr/supervision.ts";
import type { SupervisedNoteRecord, SuperviseeKind } from "../lib/ehr/supervision.ts";
import { validateClinicalReview } from "../lib/ehr/billing-model.ts";

function content(overrides: Record<string, unknown> = {}) {
  return sanitizeSupervisedContent({
    title: "Progress note",
    noteType: "Follow-up Progress Note",
    modality: "CBT",
    body: "Session body.",
    sessionMinutes: "53",
    codeDraft: {
      chiefComplaint: "Anxiety",
      primaryDiagnosis: "F41.1",
      serviceCode: "90837",
      providerSignature: "",
    },
    ...overrides,
  });
}

function record(kind: SuperviseeKind, status: SupervisedNoteRecord["status"], extra: Partial<SupervisedNoteRecord> = {}): SupervisedNoteRecord {
  return {
    noteId: "note-1",
    clientId: "client-1",
    superviseeEmail: "intern@example.com",
    superviseeName: "Jamie Intern",
    superviseeCredential: kind === "intern" ? "MSW intern" : "LMSW",
    kind,
    supervisorSub: "sup-1",
    supervisorEmail: "owner@example.com",
    supervisorName: "Kenseener Carpenter",
    supervisorCredential: "LCSW",
    status,
    version: 1,
    dateOfService: "2025-01-15",
    appointmentId: "appt-1",
    note: content(),
    submittedAt: "2025-01-15T20:00:00.000Z",
    history: [],
    revision: 1,
    ...(status === "finalized"
      ? {
          finalizedAt: "2025-01-16T15:00:00.000Z",
          finalSignature: { provider: "Kenseener Carpenter", credential: "LCSW", providerNpi: "1417470964", providerLicense: "103235", signedAt: "2025-01-16T15:00:00.000Z" },
        }
      : {}),
    ...extra,
  };
}

test("status transitions: submit, return, resubmit, cosign", () => {
  assert.equal(nextSupervisionStatus(null, "submit"), "pending");
  assert.equal(nextSupervisionStatus("returned", "submit"), "pending");
  assert.equal(nextSupervisionStatus("pending", "cosign"), "finalized");
  assert.equal(nextSupervisionStatus("pending", "return"), "returned");
});

test("illegal transitions throw", () => {
  assert.throws(() => nextSupervisionStatus("pending", "submit"));
  assert.throws(() => nextSupervisionStatus("finalized", "submit"));
  assert.throws(() => nextSupervisionStatus("finalized", "cosign"));
  assert.throws(() => nextSupervisionStatus("finalized", "return"));
  assert.throws(() => nextSupervisionStatus("returned", "cosign"));
  assert.throws(() => nextSupervisionStatus(null, "cosign"));
});

test("return requires a comment", () => {
  assert.throws(() => requireReturnComment(""));
  assert.throws(() => requireReturnComment("   "));
  assert.throws(() => requireReturnComment(undefined));
  assert.equal(requireReturnComment("  Add risk assessment  "), "Add risk assessment");
});

test("status labels differ for interns and licensed supervisees", () => {
  assert.equal(supervisionStatusLabel("intern", "pending"), "Pending supervisor review");
  assert.equal(supervisionStatusLabel("supervised_clinician", "pending"), "Pending supervisor co-sign");
  assert.equal(supervisionStatusLabel("intern", "returned"), "Returned for revision");
  assert.equal(supervisionStatusLabel("intern", "finalized"), "Final");
});

test("required-field gate names each missing item", () => {
  const empty = sanitizeSupervisedContent({});
  const result = validateSupervisedSubmission("intern", { content: empty, dateOfService: "" }, "Jamie Intern");
  assert.equal(result.ok, false);
  for (const item of ["note title", "note text", "date of service", "chief complaint / reason for visit", "session time", "primary ICD diagnosis", "billing CPT/HCPCS code"]) {
    assert.ok(result.missing.includes(item), item);
  }
  assert.equal(validateSupervisedSubmission("intern", { content: content(), dateOfService: "2025-01-15" }, "Jamie Intern").ok, true);
});

test("an intern submission with any signature is rejected", () => {
  const result = validateSupervisedSubmission("intern", { content: content(), dateOfService: "2025-01-15", signatureName: "Jamie Intern" }, "Jamie Intern");
  assert.equal(result.ok, false);
  const withDraftSig = content({ codeDraft: { chiefComplaint: "a", primaryDiagnosis: "b", serviceCode: "c", providerSignature: "Kenseener Carpenter" } });
  assert.equal(validateSupervisedSubmission("intern", { content: withDraftSig, dateOfService: "2025-01-15" }, "Jamie Intern").ok, false);
});

test("a licensed supervisee must type their own name", () => {
  const ok = validateSupervisedSubmission("supervised_clinician", { content: content(), dateOfService: "2025-01-15", signatureName: "Jamie Intern" }, "Jamie Intern");
  assert.equal(ok.ok, true);
  const wrong = validateSupervisedSubmission("supervised_clinician", { content: content(), dateOfService: "2025-01-15", signatureName: "Kenseener Carpenter" }, "Jamie Intern");
  assert.equal(wrong.ok, false);
  const none = validateSupervisedSubmission("supervised_clinician", { content: content(), dateOfService: "2025-01-15" }, "Jamie Intern");
  assert.equal(none.ok, false);
});

test("canSupervise: owner or assigned provider, never the author", () => {
  const target = { supervisorSub: "sup-1", supervisorEmail: "owner@example.com", superviseeEmail: "intern@example.com" };
  assert.equal(canSupervise({ role: "owner", sub: "x", email: "someone@example.com" }, target), true);
  assert.equal(canSupervise({ role: "provider", sub: "sup-1", email: "owner@example.com" }, target), true);
  assert.equal(canSupervise({ role: "provider", sub: "other", email: "other@example.com" }, target), false);
  assert.equal(canSupervise({ role: "clinical_staff", sub: "sup-1", email: "owner@example.com" }, target), false);
  assert.equal(canSupervise({ role: "owner", sub: "x", email: "INTERN@example.com" }, target), false);
});

test("attribution shows one signer for an intern and both for an LMSW", () => {
  const intern = supervisionAttribution(record("intern", "finalized"));
  assert.equal(intern[0], "Drafted by Jamie Intern, reviewed and signed by Kenseener Carpenter, LCSW");
  assert.ok(intern.length >= 2);
  const lmsw = supervisionAttribution(record("supervised_clinician", "finalized"));
  assert.ok(lmsw[0].includes("Signed by Jamie Intern, LMSW"));
  assert.ok(lmsw[1].includes("Reviewed and co-signed by Kenseener Carpenter, LCSW"));
});

test("claim overlay blocks while a matching note is pending or returned", () => {
  const claim = { clientId: "client-1", dateOfService: "2025-01-15", appointmentId: "" };
  for (const status of ["pending", "returned"] as const) {
    const overlaid = withSupervisionStatus(claim, [record("intern", status)]);
    assert.equal((overlaid as any).supervisorCosignRequired, true);
    assert.ok(!(overlaid as any).supervisorCosignedAt);
  }
});

test("claim overlay blocks the clinical review until the note is finalized", () => {
  const base = {
    clientId: "client-1",
    dateOfService: "2025-01-15",
    sessionMinutes: 53,
    diagnoses: [{ code: "F41.1", label: "GAD", rank: "primary" as const }],
    serviceLines: [{ code: "90837", label: "Psychotherapy", units: 1, chargeAmount: 175 }],
    providerSignature: "Kenseener Carpenter",
    renderingProviderNpi: "1417470964",
  };
  const blocked = validateClinicalReview(withSupervisionStatus(base, [record("intern", "pending")]));
  assert.equal(blocked.ok, false);
  assert.ok(blocked.missing.includes("Supervisor co-sign required"));
  const open = validateClinicalReview(withSupervisionStatus(base, [record("intern", "finalized")]));
  assert.equal(open.ok, true);
});

test("claim overlay ignores other clients and unrelated finalized notes", () => {
  const other = { clientId: "client-2", dateOfService: "2025-01-15" };
  assert.equal(withSupervisionStatus(other, [record("intern", "pending")]), other);
  const otherDay = { clientId: "client-1", dateOfService: "2025-02-01" };
  assert.equal(withSupervisionStatus(otherDay, [record("intern", "finalized")]), otherDay);
  const byAppt = { clientId: "client-1", dateOfService: "2025-02-01", appointmentId: "appt-1" };
  assert.equal(claimSupervisionState(byAppt, [record("intern", "finalized")]).required, true);
});

test("an unsigned supervisee note blocks the client's claims even when the supplied date does not match", () => {
  const mismatched = { clientId: "client-1", dateOfService: "2025-02-01", appointmentId: "" };
  for (const status of ["pending", "returned"] as const) {
    const overlaid = withSupervisionStatus(mismatched, [record("intern", status)]);
    assert.equal((overlaid as any).supervisorCosignRequired, true);
    assert.ok(!(overlaid as any).supervisorCosignedAt);
  }
});

test("only the owner may administer supervision, and owners or supervisors cannot be supervisees", () => {
  assert.equal(canAdministerSupervision("owner", false), true);
  assert.equal(canAdministerSupervision("provider", false), false);
  assert.equal(canAdministerSupervision("clinical_staff", false), false);
  assert.equal(canAdministerSupervision("owner", true), false);
  assert.ok(superviseeTargetProblem("Owner@Example.com", "owner@example.com", []));
  assert.ok(superviseeTargetProblem("boss@example.com", "owner@example.com", [{ supervisorEmail: "BOSS@example.com" }]));
  assert.equal(superviseeTargetProblem("intern@example.com", "owner@example.com", [{ supervisorEmail: "owner@example.com" }]), "");
});

test("reconcile restores a finalized note over a stale pending copy", () => {
  const stale = [{ id: "note-1", status: "Pending supervisor review", signature: null, title: "stale" }];
  const result = reconcileSupervisedNotes(stale, [record("intern", "finalized")], null);
  assert.equal(result.length, 1);
  assert.equal(result[0].status, "Final");
  assert.equal(result[0].signature.provider, "Kenseener Carpenter");
  assert.ok(String(result[0].content).includes("reviewed and signed by Kenseener Carpenter, LCSW"));
});

test("reconcile strips an intern's forged signature and keeps the owner's notes", () => {
  const incoming = [
    { id: "forged", authorEmail: "intern@example.com", status: "Signed by provider", signature: { provider: "Kenseener Carpenter" } },
    { id: "owner-note", status: "Signed by provider", signature: { provider: "Kenseener Carpenter" } },
  ];
  const writer = { email: "intern@example.com", kind: "intern" as SuperviseeKind };
  assert.deepEqual(findIllegalFinalization(incoming, [], writer.email), ["forged"]);
  const result = reconcileSupervisedNotes(incoming, [], writer);
  assert.equal(result[0].signature, null);
  assert.equal(result[0].status, "Draft - not submitted");
  assert.equal(result[1].signature.provider, "Kenseener Carpenter");
});

test("reconcile does not overwrite a returned note's in-progress edits but drops signatures", () => {
  const incoming = [{ id: "note-1", title: "my edit", signature: { provider: "x" }, authorEmail: "intern@example.com" }];
  const result = reconcileSupervisedNotes(incoming, [record("intern", "returned", { returnComment: "Add plan" })], null);
  assert.equal(result[0].title, "my edit");
  assert.equal(result[0].signature, null);
  assert.equal(result[0].supervision.returnComment, "Add plan");
});
