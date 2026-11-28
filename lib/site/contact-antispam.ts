export const HONEYPOT_FIELD = "website";
export const TURNSTILE_FIELD = "cf-turnstile-response";

export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_PHONE_LENGTH = 40;
export const MAX_MESSAGE_LENGTH = 5000;
export const MIN_MESSAGE_LENGTH = 10;

export const RATE_LIMIT_MAX_PER_HOUR = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function readContactForm(request: Request): Promise<URLSearchParams | null> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/x-www-form-urlencoded" || !request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 96 * 1024) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
  const form = new URLSearchParams(body);
  for (const field of ["name", "email", "phone", "message", "website", "cf-turnstile-response", "copy"]) {
    if (form.getAll(field).length > 1) return null;
  }
  return form;
}

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
    name: sanitizeText(input.name).replace(/[\t\n]/g, " ").slice(0, MAX_NAME_LENGTH),
    email: sanitizeText(input.email).replace(/[\t\n]/g, "").slice(0, MAX_EMAIL_LENGTH),
    phone: sanitizeText(input.phone).slice(0, MAX_PHONE_LENGTH),
    message: sanitizeText(input.message).slice(0, MAX_MESSAGE_LENGTH),
  };

  if (sanitized.name.length < 2 || input.name.length > MAX_NAME_LENGTH) errors.push("name");
  if (
    sanitized.email.length < 3 ||
    input.email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(sanitized.email)
  ) {
    errors.push("email");
  }
  const phoneDigits = sanitized.phone.replace(/\D/g, "");
  if (
    phoneDigits.length < 7 ||
    input.phone.length > MAX_PHONE_LENGTH ||
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
const MAX_TRACKED_IPS = 10_000;

export function isRateLimited(ip: string, now = Date.now()): boolean {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  if (!attemptsByIp.has(ip) && attemptsByIp.size >= MAX_TRACKED_IPS) {
    for (const [key, timestamps] of attemptsByIp) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) attemptsByIp.delete(key);
    }
    if (attemptsByIp.size >= MAX_TRACKED_IPS) return true;
  }
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

export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_ARN || process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(
  token: string,
  secret = process.env.TURNSTILE_SECRET_KEY || "",
): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  try {
    if (!secret) {
      console.error("Contact form Turnstile secret is not configured");
      return false;
    }
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      console.error("Contact form Turnstile service returned an error", response.status);
      return false;
    }
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("Contact form Turnstile verification unavailable", error instanceof Error ? error.name : "unknown error");
    return false;
  }
}
