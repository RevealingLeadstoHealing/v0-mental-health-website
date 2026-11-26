import assert from "node:assert/strict";
import test from "node:test";
import {
  clearRateLimitState,
  isRateLimited,
  sanitizeText,
  turnstileConfigured,
  validateContactForm,
  verifyTurnstileToken,
} from "../lib/site/contact-antispam.ts";

const good = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "(914) 635-2687",
  message: "Please call me about starting therapy.",
  honeypot: "",
};

test("a real submission passes validation", () => {
  const result = validateContactForm(good);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("a filled honeypot is rejected", () => {
  const result = validateContactForm({ ...good, honeypot: "http://spam.example" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("honeypot"));
});

test("a bad email address is rejected", () => {
  assert.equal(validateContactForm({ ...good, email: "not-an-email" }).ok, false);
  assert.equal(validateContactForm({ ...good, email: "a@b" }).ok, false);
});

test("empty and oversized fields are rejected", () => {
  assert.equal(validateContactForm({ ...good, name: "" }).ok, false);
  assert.equal(validateContactForm({ ...good, message: "hi" }).ok, false);
  assert.equal(validateContactForm({ ...good, message: "x".repeat(5001) }).ok, false);
  assert.equal(validateContactForm({ ...good, phone: "12" }).ok, false);
});

test("HTML is stripped from fields before sending", () => {
  assert.equal(sanitizeText('Hello <script>alert(1)</script> world'), "Hello alert(1) world");
  const result = validateContactForm({
    ...good,
    name: "<b>Jane</b> Doe",
    message: "Please <a href='http://spam.example'>click here</a> to talk.",
  });
  assert.equal(result.ok, true);
  assert.equal(result.sanitized.name, "Jane Doe");
  assert.doesNotMatch(result.sanitized.message, /<[^>]*>/);
});

test("rate limiting allows 5 submissions per hour per IP, then blocks", () => {
  clearRateLimitState();
  const ip = "203.0.113.9";
  for (let i = 0; i < 5; i++) {
    assert.equal(isRateLimited(ip), false, `attempt ${i + 1} should pass`);
  }
  assert.equal(isRateLimited(ip), true, "6th attempt in the hour should be blocked");
  // A different IP is not affected.
  assert.equal(isRateLimited("198.51.100.7"), false);
  clearRateLimitState();
});

test("Turnstile is skipped when no secret is configured", async () => {
  assert.equal(turnstileConfigured(), false);
  assert.equal(await verifyTurnstileToken("any-token"), false);
});
