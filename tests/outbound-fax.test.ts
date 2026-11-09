import test from "node:test";
import assert from "node:assert/strict";
import { isPdfBytes, maskFaxNumber, normalizeUsFaxNumber, parseFaxSendMode, validateFaxSend } from "../lib/ehr/outbound-fax.ts";

test("send mode defaults to off unless exactly dry-run or live", () => {
  assert.equal(parseFaxSendMode(undefined), "off");
  assert.equal(parseFaxSendMode(""), "off");
  assert.equal(parseFaxSendMode("yes"), "off");
  assert.equal(parseFaxSendMode("dry-run"), "dry-run");
  assert.equal(parseFaxSendMode(" LIVE "), "live");
});

test("US fax numbers normalize to E.164 and bad numbers are rejected", () => {
  assert.equal(normalizeUsFaxNumber("(914) 371-3845"), "+19143713845");
  assert.equal(normalizeUsFaxNumber("1-914-371-3845"), "+19143713845");
  assert.equal(normalizeUsFaxNumber("123-456-7890"), "");
  assert.equal(normalizeUsFaxNumber("914371384"), "");
  assert.equal(normalizeUsFaxNumber("abc9143713845"), "");
  assert.equal(maskFaxNumber("+19143713845"), "***-***-3845");
});

test("PDF bytes are recognized by header", () => {
  assert.equal(isPdfBytes(new TextEncoder().encode("%PDF-1.7 data")), true);
  assert.equal(isPdfBytes(new TextEncoder().encode("<html>")), false);
});

test("send validation requires number, PDF, authorization and token", () => {
  const ok = { faxNumber: "9143713845", authorizationConfirmed: true, sendToken: "abcdef0123456789abcd", hasPdf: true };
  assert.deepEqual(validateFaxSend(ok), []);
  assert.equal(validateFaxSend({ ...ok, authorizationConfirmed: false }).length, 1);
  assert.equal(validateFaxSend({ ...ok, hasPdf: false }).length, 1);
  assert.equal(validateFaxSend({ ...ok, sendToken: "short" }).length, 1);
  assert.equal(validateFaxSend({ ...ok, faxNumber: "555" }).length, 1);
});
