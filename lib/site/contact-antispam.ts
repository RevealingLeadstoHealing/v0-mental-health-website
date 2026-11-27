// Anti-spam protection for the public Contact form.
//
// Added 2026-11-26 (P0 fix for AWS SES Case 179496551900783): the form
// previously accepted any POST with non-empty fields, so bots posted
// directly to /api/contact and flooded connect@rlth.org (and the EHR
// consultation-alert) with thousands of spam emails. These checks run
// server-side in app/api/contact/route.ts BEFORE any email is sent and
// BEFORE the DynamoDB consultation-alert is written.
//
// Layers, in the order the route applies them:
//   1. Per-IP rate limiting (in-memory, per server instance — see below).
//   2. Honeypot field: a hidden "website" input real people never fill.
//   3. Strict validation + sanitization of every field.
//   4. Cloudflare Turnstile, when keys are configured (see below).
//
// Turnstile: the widget only renders when NEXT_PUBLIC_TURNSTILE_SITE_KEY
// is set, and verification only runs when TURNSTILE_SECRET_KEY is set.
// Until Kay / the deployer creates keys in the Cloudflare dashboard and
// sets both variables in AWS Amplify, layers 1-3 are the active
// protection. When the secret IS set, Turnstile verification is fail-closed:
// a missing or failed token is rejected.

export const HONEYPOT_FIELD = "website";
export const TURNSTILE_FIELD = "cf-turnstile-response";

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_PHONE_LENGTH = 40;
export const MAX_MESSAGE_LENGTH = 5000;
export const MIN_MESSAGE_LENGTH = 10;

export const RATE_LIMIT_MAX_PER_HOUR = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export interface ContactFormFields {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export interface ContactValidation {
  ok: boolean;
  errors: string[];
  sanitized: ContactFormFields;
}

/**
 * Strip HTML tags and control characters (keeps tab, newline and space,
 * and all printable / non-ASCII text). Implemented as an explicit loop
 * so no control-character escapes appear in the source.
 */
export function sanitizeText(value: string): string {
  const noTags = value.replace(/<[^>]*>/g, "");
  let out = "";
  for (const ch of noTags) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 9 || code === 10 || code === 32 || (code >= 33 && code !== 127)) {
      out += ch;
    }
  }
  return out.trim();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[+()\-.\s\d]*$/;

export function validateContactForm(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
  honeypot: string;
}): ContactValidation {
  const errors: string[] = [];

  // Honeypot: any value means a bot filled a field humans never see.
  if (input.honeypot && input.honeypot.trim() !== "") {
    errors.push("honeypot");
  }

  const sanitized: ContactFormFields = {
    name: sanitizeText(input.name).slice(0, MAX_NAME_LENGTH),
    email: sanitizeText(input.email).slice(0, MAX_EMAIL_LENGTH),
    phone: sanitizeText(input.phone).slice(0, MAX_PHONE_LENGTH),
    message: sanitizeText(input.message).slice(0, MAX_MESSAGE_LENGTH),
  };

  if (sanitized.name.length < 2) errors.push("name");
  if (
    sanitized.email.length < 3 ||
    sanitized.email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(sanitized.email)
  ) {
    errors.push("email");
  }
  const phoneDigits = sanitized.phone.replace(/\D/g, "");
  if (
    phoneDigits.length < 7 ||
    sanitized.phone.length > MAX_PHONE_LENGTH ||
    !PHONE_PATTERN.test(sanitized.phone)
  ) {
    errors.push("phone");
  }
  if (
    sanitized.message.length < MIN_MESSAGE_LENGTH ||
    input.message.trim().length > MAX_MESSAGE_LENGTH
  ) {
    errors.push("message");
  }

  return { ok: errors.length === 0, errors, sanitized };
}

// --- Per-IP rate limiting (in-memory) -------------------------------------
// One entry per client IP: timestamps of recent accepted attempts.
// Limitation: this lives in the memory of a single server instance. On
// Amplify / serverless the map resets when an instance is recycled, so it
// is a cheap first layer only — Turnstile is the durable bot defence once
// its keys are configured. It still stops a single bot hammering the form
// in a burst, which is exactly how the spam flood arrived.
const attemptsByIp = new Map<string, number[]>();

export function isRateLimited(ip: string, now = Date.now()): boolean {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (attemptsByIp.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RATE_LIMIT_MAX_PER_HOUR) {
    attemptsByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  attemptsByIp.set(ip, recent);
  return false;
}

/** For tests only: clear the in-memory rate-limit state. */
export function clearRateLimitState(): void {
  attemptsByIp.clear();
}

/** Best-effort client IP from proxy headers (Amplify sits behind a proxy). */
export function clientIpFromHeaders(headers: {
  get(name: string): string | null;
}): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

// --- Cloudflare Turnstile --------------------------------------------------
export function turnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
}

export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verify a Turnstile token with Cloudflare. Returns false on any failure
 * (network error, bad token, missing token). Callers must only call this
 * when turnstileConfigured() is true; when it is false, skip verification
 * and rely on the honeypot / rate-limit / validation layers.
 */
export async function verifyTurnstileToken(
  token: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
