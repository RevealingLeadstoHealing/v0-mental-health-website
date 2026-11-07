import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/ehr/full-production-interface.tsx", import.meta.url), "utf8");

test("telehealth presents consent before media, transcript after media, and fax last", () => {
  const consent = source.indexOf('aria-label="Client and consent before audio or video"');
  const microphone = source.indexOf('Microphone and recording', consent);
  const room = source.indexOf('<NativeTelehealthRoom', microphone);
  const transcript = source.indexOf('aria-label="Transcript review"', room);
  const history = source.indexOf('Previously saved telehealth chart history', transcript);
  const fax = source.indexOf('<FaxInbox', history);
  assert.ok(consent >= 0 && microphone > consent && room > microphone && transcript > room && history > transcript && fax > history);
  assert.ok(source.indexOf('checked={sessionForm.consentObtained}', consent) < microphone);
  assert.ok(source.indexOf('checked={sessionForm.recordingConsent}', consent) < microphone);
  assert.ok(!source.includes('label="Callback number (documentation only)"'));
  assert.ok(!source.includes('label="Optional backup session link"'));
});

const providerLabels = [
  "Patient Dashboard", "Affirmations", "Client Management", "Client Chart", "Biopsychosocial Assessment", "Follow-Up Notes",
  "Billing", "Treatment Plans", "Homework", "Assessments", "Patient Intake & Consents", "Infrastructure", "Advocacy Letters", "Patient Record Requests",
  "Provider Trainings", "Audit Log", "Telehealth", "Messages", "Scheduling",
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
    "intake", "notes", "billing", "plans", "homework", "assessments", "documents", "infrastructure", "advocacy-letters",
    "trainings",
  ]) assert.match(router, new RegExp(`page === "${route}"`));
});

test("production-facing copy contains no mock, Firebase, scaffold, or preview claims", () => {
  assert.doesNotMatch(source, /mock mode|Firebase|module scaffold|future phases|application starter|demo credentials|preview safety boundary|metadata-only preview mode/i);
});

test("client document view includes authorized templates and client uploads", () => {
  assert.match(source, /doc\.clientVisible === true \|\| doc\.uploadedByRole === "client" \|\| clientAuthorizedDocumentTitles\.has\(doc\.title\)/);
});

test("billing surfaces the per-claim deficiency list and a per-payer outstanding worklist", () => {
  // Reuses the shared validator as the single source of the deficiency list.
  assert.match(source, /import \{ claimDeficiencies \} from "\.\.\/\.\.\/lib\/ehr\/billing-model"/);
  // Per-claim named deficiencies in the review queue.
  assert.match(source, /Deficient for a clean, approvable claim/);
  // Per-payer outstanding-deficiency worklist that deep-links to the claim.
  assert.match(source, /Outstanding billing deficiencies by payer/);
  assert.match(source, /setPage\("billing", \{ clientId: claim\.clientId, claimId: claim\.claimId \}\)/);
});

test("a standing provider worklist names incomplete notes and deficient claims and deep-links to each", () => {
  const worklist = source.slice(source.indexOf("function useDeficiencyWorklist"), source.indexOf("function MainApp"));
  assert.match(worklist, /Signature missing/);
  assert.match(worklist, /claimDeficiencies\(claim\)/);
  const banner = source.slice(source.indexOf("deficiencyWorklist.items.length > 0"), source.indexOf("<motion.div initial"));
  assert.match(banner, /setPage\("notes", \{ clientId: item\.clientId, noteId: item\.noteId \}\)/);
  assert.match(banner, /setPage\("billing", \{ clientId: item\.clientId, claimId: item\.claimId \}\)/);
});

test("signature choices match the authenticated provider or client role", () => {
  const signaturePanel = source.slice(source.indexOf('<Card id="document-signatures"'), source.indexOf('<Card id="document-upload"'));
  assert.match(signaturePanel, /Provider signature/);
  assert.match(signaturePanel, /Client \/ patient signature/);
  assert.doesNotMatch(signaturePanel, /Guardian/);
});

test("supervisor co-sign worklist and note flows are wired", () => {
  const worklist = source.slice(source.indexOf("function useDeficiencyWorklist"), source.indexOf("function MainApp"));
  assert.match(worklist, /Co-sign needed:/);
  assert.match(worklist, /\/api\/ehr\/supervision\?scope=feed/);
  assert.match(worklist, /Signature missing/);
  const notes = source.slice(source.indexOf("function ProgressNotesPage"), source.indexOf("const billingPayerDefinitions"));
  assert.match(notes, /Submit for supervisor review/);
  assert.match(notes, /Returned for revision/);
  assert.match(notes, /Sign and finalize note/);
  assert.match(notes, /Sign and save note/);
  // The supervisor's typed-name signature is never prefilled with the owner's name.
  const panel = notes.slice(notes.indexOf("Supervisor review:"), notes.indexOf("displayNotes.length === 0"));
  assert.doesNotMatch(panel, /PRACTITIONER_NAME/);
  assert.match(panel, /value=\{reviewSignature\}/);
});
