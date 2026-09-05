import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const health = fs.readFileSync("app/api/ehr/health/route.ts", "utf8");
const status = fs.readFileSync("app/api/ehr/aws-status/route.ts", "utf8");

test("PHI readiness is an explicit production approval rather than a hard-coded label", () => {
  assert.match(health, /process\.env\.EHR_PHI_ENTRY_ALLOWED === "true"/);
  assert.match(health, /phiEntryAllowed,/);
  assert.doesNotMatch(health, /phiEntryAllowed:\s*false/);
});

test("AWS runtime status names Amplify rather than the retired Vercel runtime", () => {
  assert.match(status, /Amplify Hosting compute branch/);
  assert.doesNotMatch(status, /Vercel/);
});
