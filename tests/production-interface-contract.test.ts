import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/ehr/full-production-interface.tsx", import.meta.url), "utf8");

const providerLabels = [
  "Patient Dashboard", "Affirmations", "Client Management", "Client Chart", "Biopsychosocial Assessment", "Follow-Up Notes",
  "Billing", "Treatment Plans", "Homework", "Assessments", "Patient Intake & Consents", "Infrastructure",
  "Provider Trainings", "Record Requests", "Audit Log", "Telehealth", "Messages", "Scheduling",
  "Psychoeducation", "Journaling",
];

const clientLabels = [
  "Dashboard", "Journal", "Affirmations", "Psychoeducation", "Homework", "Messages", "Documents",
  "Record Request", "Telehealth", "Scheduling",
];

test("provider and client navigation contain every agreed production label", () => {
  const mainApp = source.slice(source.indexOf("function MainApp"), source.indexOf("function PageRouter"));
  for (const label of providerLabels) assert.match(mainApp, new RegExp(`"${label.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}"`));
  for (const label of clientLabels) assert.match(mainApp, new RegExp(`"${label.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}"`));
});

test("every role-specific production route resolves to a page", () => {
  const router = source.slice(source.indexOf("function PageRouter"), source.indexOf("function SectionHeader"));
  for (const route of [
    "dashboard", "journal", "affirmations", "psychoeducation", "homework-client", "messages",
    "records-request", "record-requests", "audit-log", "telehealth", "schedule", "clients", "chart",
    "intake", "notes", "billing", "plans", "homework", "assessments", "documents", "infrastructure",
    "trainings",
  ]) assert.match(router, new RegExp(`page === "${route}"`));
});

test("production-facing copy contains no mock, Firebase, scaffold, or preview claims", () => {
  assert.doesNotMatch(source, /mock mode|Firebase|module scaffold|future phases|application starter|demo credentials|preview safety boundary|metadata-only preview mode/i);
});

test("client document view includes authorized templates and client uploads", () => {
  assert.match(source, /doc\.clientVisible === true \|\| doc\.uploadedByRole === "client" \|\| clientAuthorizedDocumentTitles\.has\(doc\.title\)/);
});

test("signature choices match the authenticated provider or client role", () => {
  const signaturePanel = source.slice(source.indexOf('<Card id="document-signatures"'), source.indexOf('<Card id="document-upload"'));
  assert.match(signaturePanel, /Provider signature/);
  assert.match(signaturePanel, /Client \/ patient signature/);
  assert.doesNotMatch(signaturePanel, /Guardian/);
});
