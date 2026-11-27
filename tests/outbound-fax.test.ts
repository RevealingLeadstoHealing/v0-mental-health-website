import test from "node:test";
import assert from "node:assert/strict";
import { isPdfBytes, maskFaxNumber, normalizeUsFaxNumber, parseFaxSendMode, validateFaxSend } from "../lib/ehr/outbound-fax.ts";
import { isOutboundSpruceItem } from "../lib/spruce/outbound-detect.ts";

test("send mode defaults to off unless exactly dry-run or live", () => {
  assert.equal(parseFaxSendMode(undefined), "off");
  assert.equal(parseFaxSendMode(""), "off");
  assert.equal(parseFaxSendMode("yes"), "off");
  assert.equal(parseFaxSendMode("dry-run"), "dry-run");
  assert.equal(parseFaxSendMode("live"), "live");
  assert.equal(parseFaxSendMode(" LIVE "), "off");
  assert.equal(parseFaxSendMode("Live"), "off");
  assert.equal(parseFaxSendMode("DRY-RUN"), "off");
});

test("US fax numbers normalize to E.164 and bad numbers are rejected", () => {
  assert.equal(normalizeUsFaxNumber("(914) 371-3845"), "+19143713845");
  assert.equal(normalizeUsFaxNumber("1-914-371-3845"), "+19143713845");
  assert.equal(normalizeUsFaxNumber("123-456-7890"), "");
  assert.equal(normalizeUsFaxNumber("914371384"), "");
  assert.equal(normalizeUsFaxNumber("abc9143713845"), "");
  assert.equal(maskFaxNumber("+19143713845"), "***-***-3845");
});

test("webhook skips our own outbound faxes by several signals", () => {
  const line = "+19143713845";
  assert.equal(isOutboundSpruceItem({ direction: "outbound" }, line), true);
  assert.equal(isOutboundSpruceItem({ outbound: true }, line), true);
  assert.equal(isOutboundSpruceItem({ author: { phoneNumber: "(914) 371-3845" } }, line), true);
  assert.equal(isOutboundSpruceItem({ source: { value: "+19143713845" } }, line), true);
  assert.equal(isOutboundSpruceItem({ author: { type: "teamMember" } }, line), true);
  assert.equal(isOutboundSpruceItem({ author: { phoneNumber: "+12125550100", type: "contact" } }, line), false);
  assert.equal(isOutboundSpruceItem({ direction: "inbound", source: { value: "+12125550100" } }, line), false);
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
