import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NON_SNAPSHOT_SK_RANGES, isValidModuleKey, latestModuleRecordId, newestSnapshotPerModule } from "../lib/ehr/module-snapshots.ts";

const store = readFileSync(new URL("../lib/ehr/dynamodb-store.ts", import.meta.url), "utf8");
const recordsRoute = readFileSync(new URL("../app/api/ehr/records/route.ts", import.meta.url), "utf8");
const ui = readFileSync(new URL("../app/ehr/full-production-interface.tsx", import.meta.url), "utf8");

test("newest snapshot per module wins regardless of history length", () => {
  const items = [
    { recordId: "record_1_a", createdAt: "2026-09-20T10:00:00.000Z", payload: { moduleKey: "documents" } },
    ...Array.from({ length: 500 }, (_, i) => ({ recordId: `record_${2 + i}_b`, createdAt: `2026-09-20T11:${String(i % 60).padStart(2, "0")}:00.000Z`, payload: { moduleKey: "intake" } })),
    { recordId: "record_9_c", createdAt: "2026-09-20T09:00:00.000Z", payload: { moduleKey: "documents" } },
    { recordId: "record_9_d", createdAt: "2026-09-20T12:00:00.000Z", payload: { moduleKey: "treatmentPlans" } },
    { recordId: "record_9_e", createdAt: "2026-09-20T12:00:00.000Z", payload: { moduleKey: "../bad" } },
  ];
  const newest = newestSnapshotPerModule(items);
  assert.deepEqual([...newest.keys()].sort(), ["documents", "intake", "treatmentPlans"]);
  assert.equal(newest.get("documents")?.recordId, "record_1_a");
});

test("latest-copy record ids are stable and validated", () => {
  assert.equal(latestModuleRecordId("documents"), "module_documents");
  assert.equal(isValidModuleKey("privateJournalEntries"), true);
  assert.equal(isValidModuleKey("a#b"), false);
  assert.throws(() => latestModuleRecordId(""));
});

test("non-snapshot ranges exclude every snapshot sort key", () => {
  const snapshotSk = "RECORD#ehr-module-snapshot#record_1790000000000_abc";
  const inRange = (sk: string) => NON_SNAPSHOT_SK_RANGES.some(([from, to]) => sk >= from && sk <= to);
  assert.equal(inRange(snapshotSk), false);
  assert.equal(inRange("RECORD#ehr-module-snapshot#module_documents"), false);
  for (const type of ["appointment", "assessment", "clinical-note", "healthscribe-job", "microphone-captions", "treatment-plan"]) {
    assert.equal(inRange(`RECORD#${type}#record_1_x`), true, type);
  }
});

test("module saves keep a latest copy and chart load reads it", () => {
  assert.match(recordsRoute, /listClientChartRecords\(clientId, limit\)/);
  assert.match(recordsRoute, /putLatestModuleSnapshot\(actor, clientId, payload, status\)/);
  assert.match(store, /backfillLatestModuleSnapshots/);
  assert.match(store, /attribute_not_exists\(PK\) AND attribute_not_exists\(SK\)/);
});

test("providers can view preserved signed consent copies", () => {
  assert.match(ui, /\{selectedClientId && !advocacyMode && <SignedDocuments clientId=\{selectedClientId\} \/>\}/);
});

test("treatment plan can carry diagnoses over from the biopsychosocial without inventing goals", () => {
  const plans = ui.slice(ui.indexOf("function TreatmentPlansPage"));
  assert.match(plans, /Copy diagnoses and problem from Biopsychosocial/);
  assert.match(plans, /primaryDiagnosis: current\.primaryDiagnosis \|\| biopsychosocial\.primaryDiagnosis/);
  assert.doesNotMatch(plans.slice(0, plans.indexOf("const save = async")), /goals: .*treatmentGoals/);
});

test("a new biopsychosocial does not start pre-signed", () => {
  const intakePage = ui.slice(ui.indexOf("function IntakePage()"), ui.indexOf("const handleSubmitIntake"));
  assert.doesNotMatch(intakePage, /providerSignature: PRACTITIONER_NAME/);
});
