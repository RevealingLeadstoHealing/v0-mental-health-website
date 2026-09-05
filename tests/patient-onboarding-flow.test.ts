import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const interfaceSource = readFileSync(new URL("../app/ehr/full-production-interface.tsx", import.meta.url), "utf8");
const clientRouteSource = readFileSync(new URL("../app/api/ehr/clients/route.ts", import.meta.url), "utf8");

test("patient chart and onboarding records save before the intake invitation is offered", () => {
  const saveStart = interfaceSource.indexOf("const createClient = async");
  const saveEnd = interfaceSource.indexOf("const value = useMemo", saveStart);
  const saveFlow = interfaceSource.slice(saveStart, saveEnd);
  assert.match(saveFlow, /sendInvitation: false/);
  assert.ok(saveFlow.indexOf('persistModuleSnapshot(client.clientId, "documents"') < saveFlow.indexOf('return { ...client, invitationSent: false'));
  assert.ok(saveFlow.indexOf('persistModuleSnapshot(client.clientId, "intake"') < saveFlow.indexOf('return { ...client, invitationSent: false'));
  assert.doesNotMatch(saveFlow, /action: "resendInvitation"/);
});

test("Send Intake Package is directly available after Save Patient and preserves resend", () => {
  const pageStart = interfaceSource.indexOf("function ClientManagementPage()");
  const pageEnd = interfaceSource.indexOf("function getDocumentWorkflow", pageStart);
  const page = interfaceSource.slice(pageStart, pageEnd);
  assert.ok(page.indexOf('"Save Patient"') < page.indexOf('"Send Intake Package"'));
  assert.match(page, /"Resend Intake Package"/);
  assert.match(page, /"Send \/ Resend Patient Invitation"/);
  assert.match(page, /intake and consent access/);
  assert.match(page, /Telehealth remains available inside that patient’s authenticated portal/);
});

test("temporary patient passwords meet the agreed 14-character composition", () => {
  assert.match(clientRouteSource, /while \(characters\.length < 14\)/);
  assert.match(clientRouteSource, /const groups = \[upper, lower, digits, symbols\]/);
  assert.match(clientRouteSource, /TemporaryPassword: temporaryPatientPassword\(\)/);
});
