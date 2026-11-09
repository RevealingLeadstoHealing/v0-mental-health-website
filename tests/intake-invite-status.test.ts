import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { describeInviteEmailStatus } from "../lib/ehr/invite-email-status.ts";

test("status mapping: sent is delivered, everything else is not", () => {
  assert.equal(describeInviteEmailStatus("sent").delivered, true);
  assert.equal(describeInviteEmailStatus(undefined).delivered, false);
  const nc = describeInviteEmailStatus("not-configured");
  assert.equal(nc.delivered, false);
  assert.match(nc.message, /AWS credentials/);
  const ef = describeInviteEmailStatus("email-failed: SES 403 - not verified");
  assert.match(ef.message, /SES 403 - not verified/);
  assert.match(describeInviteEmailStatus("email-error: boom").message, /boom/);
});

test("UI only marks Sent after checking email status; server returns emailDelivered", () => {
  const ui = fs.readFileSync(new URL("../app/ehr/full-production-interface.tsx", import.meta.url), "utf8");
  const start = ui.indexOf("const resendPatientInvitation");
  const body = ui.slice(start, ui.indexOf("const archivePatient", start));
  assert.ok(body.includes("describeInviteEmailStatus"));
  assert.ok(body.indexOf("describeInviteEmailStatus") < body.indexOf('invitationStatus: "Sent"'));
  const api = fs.readFileSync(new URL("../app/api/ehr/clients/route.ts", import.meta.url), "utf8");
  assert.ok(api.includes('emailDelivered: inviteEmailStatus === "sent"'));
});
