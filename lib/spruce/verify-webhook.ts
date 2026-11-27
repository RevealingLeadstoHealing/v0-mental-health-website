import { createHmac, timingSafeEqual } from "node:crypto";

// Spruce signs every webhook delivery with HMAC-SHA256 over the raw request
// body, using the secret issued when the webhook destination endpoint was
// created (Settings -> Integrations & API in Spruce). The signature arrives
// base64-encoded in the X-Spruce-Signature header. Verification MUST run
// against the raw, unparsed request body — parsing to JSON first and
// re-serializing can change byte-for-byte formatting (key order, spacing)
// and silently break the comparison.
export function verifySpruceSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !secret) return false;
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHeader, "base64");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
