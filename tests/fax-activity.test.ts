import test from "node:test";
import assert from "node:assert/strict";
import { buildFaxActivity, faxActivityStatuses } from "../lib/ehr/fax-activity.ts";
const input = { id: "fax-test", recipient: "Test recipient", description: "Referral summary", status: faxActivityStatuses[0], occurredAt: "2026-09-01T10:00:00Z", evidence: "", noteId: "note-test", authorizationConfirmed: true };
const context = { clientId: "test-client", appointmentId: "test-session", actorId: "provider", actorName: "Test provider", recordedAt: "2026-09-01T12:00:00Z" };
test("fax activity links to the appointment and note without billing or client publication", () => {
  const record = buildFaxActivity(input, context);
  assert.equal(record.appointmentId, context.appointmentId);
  assert.equal(record.linkedNoteId, input.noteId);
  assert.equal(record.billable, false); assert.equal(record.clientVisible, false);
  assert.equal(record.faxActivity.deliveryVerified, false);
  assert.match(record.generatedLetterText, /does not send a fax/);
});
test("provider-reported sent requires evidence but never becomes verified delivery", () => {
  assert.throws(() => buildFaxActivity({ ...input, status: faxActivityStatuses[1] }, context));
  assert.equal(buildFaxActivity({ ...input, status: faxActivityStatuses[1], evidence: "External receipt reference 123" }, context).faxActivity.deliveryVerified, false);
  assert.throws(() => buildFaxActivity({ ...input, status: "Confirmed delivered" }, context));
});
test("missing authorization, appointment and invalid activity dates fail validation", () => {
  assert.throws(() => buildFaxActivity({ ...input, authorizationConfirmed: false }, context));
  assert.throws(() => buildFaxActivity(input, { ...context, appointmentId: "" }));
  assert.throws(() => buildFaxActivity({ ...input, occurredAt: "invalid" }, context));
});
