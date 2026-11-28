import assert from "node:assert/strict";
import test from "node:test";
import {
  clearRateLimitState,
  isRateLimited,
  readContactForm,
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

test("Turnstile rejects tokens when no secret is configured", async () => {
  assert.equal(turnstileConfigured(), false);
  assert.equal(await verifyTurnstileToken("any-token", ""), false);
});

test("Turnstile reads the secret directly from Amplify environment variables", () => {
  const previous = process.env.TURNSTILE_SECRET_KEY;
  process.env.TURNSTILE_SECRET_KEY = "direct-amplify-secret";
  assert.equal(turnstileConfigured(), true);
  process.env.TURNSTILE_SECRET_KEY = "   ";
  assert.equal(turnstileConfigured(), false);
  if (previous === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = previous;
});

test("Turnstile accepts only successful Cloudflare verification", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ success: true })));
  assert.equal(await verifyTurnstileToken("valid-token", "secret"), true);
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify({ success: false })));
  assert.equal(await verifyTurnstileToken("invalid-token", "secret"), false);
  fetchMock.mock.mockImplementation(async () => { throw new Error("offline"); });
  assert.equal(await verifyTurnstileToken("token", "secret"), false);
  assert.equal(await verifyTurnstileToken("", "secret"), false);
});

test("contact form rejects oversized, duplicate and unsupported submissions", async () => {
  const request = (body: string, type = "application/x-www-form-urlencoded") =>
    new Request("https://example.com/api/contact", { method: "POST", headers: { "content-type": type }, body });
  assert.equal((await readContactForm(request("name=Jane&message=Hello")))?.get("name"), "Jane");
  assert.equal(await readContactForm(request("name=Jane&name=Other")), null);
  assert.equal(await readContactForm(request("message=" + "a".repeat(96 * 1024))), null);
  assert.equal(await readContactForm(request("{}", "application/json")), null);
});

test("contact fields cannot inject email headers or exceed their limits", () => {
  assert.doesNotMatch(validateContactForm({ ...good, name: "Jane\nBcc: spam" }).sanitized.name, /\n/);
  assert.equal(validateContactForm({ ...good, email: "a".repeat(250) + "@example.com" }).ok, false);
  assert.equal(validateContactForm({ ...good, name: "a".repeat(101) }).ok, false);
  assert.equal(validateContactForm({ ...good, phone: "1".repeat(41) }).ok, false);
});
