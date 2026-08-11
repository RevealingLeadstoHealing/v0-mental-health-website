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
