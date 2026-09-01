import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/ehr/full-production-interface.tsx", import.meta.url), "utf8");

test("client telehealth routes to the client-only interface", () => {
  assert.match(source, /page === "telehealth" && currentUser\.role === "client"\) return <ClientTelehealthPage/);
  assert.match(source, /page === "telehealth" && currentUser\.role === "provider"\) return <TelehealthPage/);
});

test("client telehealth does not expose clinical scribe controls", () => {
  const clientView = source.slice(source.indexOf("function ClientTelehealthPage"), source.indexOf("function TelehealthPage"));
  assert.doesNotMatch(clientView, /HealthScribe|Start consented audio capture|Generate mapped note draft|ICD-10|CPT/);
});

test("telehealth uses a recurring signed-in portal link without callback or replacement-link inputs", () => {
  const clientView = source.slice(source.indexOf("function ClientTelehealthPage"), source.indexOf("function TelehealthPage"));
  const providerView = source.slice(source.indexOf("function TelehealthPage"), source.indexOf("function ClientManagementPage"));
  assert.match(clientView, /Open secure telehealth session/);
  assert.match(clientView, /\^https:\\\/\\\//);
  assert.doesNotMatch(providerView, /label="Optional backup session link"|label="Callback number \(documentation only\)"/);
  assert.match(providerView, /No dial-in or callback number is used/);
  const entry = readFileSync(new URL("../app/ehr/telehealth-entry.tsx", import.meta.url), "utf8");
  assert.match(entry, /href="\/ehr\/telehealth"/);
  assert.match(entry, /Signing in opens only your own room/);
});
