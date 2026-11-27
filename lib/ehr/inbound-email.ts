// Dependency-free raw-email parsing + HTML sanitizing for the EHR inbound inbox.
//
// SES receiving writes each delivered message to the inbound S3 bucket as a raw
// RFC 822 MIME blob. We deliberately parse it with node builtins only (no
// mailparser / no @aws-sdk/client-ses) so it can never break the Amplify build
// the way a heavy dependency might. The parser is intentionally small: it
// handles the common single-part and multipart/* shapes SES delivers, decodes
// base64 and quoted-printable transfer encodings, and prefers text/plain,
// falling back to a sanitized text/html body.

export interface ParsedEmail {
  from: string;
  to: string;
  subject: string;
  date: string;
  messageId: string;
  text: string;
  html: string;
}

export interface InboundEmailItem {
  id: string;
  size: number;
  receivedAt: string;
}

// Mirrors lib/ehr/document-storage.ts's small key helpers: cheap, pure checks
// that keep the route handler from having to reason about S3 key shapes.
export function isInboundKey(prefix: string, key: string): boolean {
  if (typeof prefix !== "string" || typeof key !== "string" || !key) return false;
  if (!key.startsWith(prefix)) return false;
  // Allow only a conservative S3 key charset so a crafted ?id can't escape the
  // prefix or smuggle control characters into the GetObject call.
  return /^[a-zA-Z0-9!._/*'()\-]+$/.test(key);
}

export function messageIdFromKey(key: string): string {
  const slash = key.lastIndexOf("/");
  return slash >= 0 ? key.slice(slash + 1) : key;
}

interface MimeNode {
  headers: Record<string, string>;
  body: string;
}

// Splits headers from the body on the first blank line and unfolds folded
// header continuation lines (leading whitespace continues the prior header).
function splitHeadersAndBody(raw: string): { headerBlock: string; body: string } {
  const normalized = raw.replace(/\r\n/g, "\n");
  const idx = normalized.indexOf("\n\n");
  if (idx === -1) return { headerBlock: normalized, body: "" };
  return { headerBlock: normalized.slice(0, idx), body: normalized.slice(idx + 2) };
}

function parseHeaders(headerBlock: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = headerBlock.split("\n");
  let current = "";
  const flush = (line: string) => {
    const colon = line.indexOf(":");
    if (colon === -1) return;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    headers[name] = value;
  };
  for (const line of lines) {
    if (/^[ \t]/.test(line) && current) {
      // Folded continuation of the previous header.
      current += " " + line.trim();
    } else {
      if (current) flush(current);
      current = line;
    }
  }
  if (current) flush(current);
  return headers;
}

function getBoundary(contentType: string): string {
  const match = /boundary\s*=\s*(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!match) return "";
  return (match[1] || match[2] || "").trim();
}

function getCharset(contentType: string): string {
  const match = /charset\s*=\s*(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  return (match ? match[1] || match[2] : "").trim().toLowerCase();
}

function decodeTransfer(body: string, encoding: string, charset: string): string {
  const enc = (encoding || "").toLowerCase();
  if (enc === "base64") {
    const cleaned = body.replace(/[^A-Za-z0-9+/=]/g, "");
    try {
      return Buffer.from(cleaned, "base64").toString(charset === "us-ascii" ? "ascii" : "utf8");
    } catch {
      return body;
    }
  }
  if (enc === "quoted-printable") {
    return decodeQuotedPrintable(body);
  }
  return body;
}

function decodeQuotedPrintable(input: string): string {
  // Join soft line breaks ("=" at end of line) then decode =XX escapes.
  const joined = input.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i++) {
    const ch = joined[i];
    if (ch === "=" && i + 2 < joined.length && /^[0-9A-Fa-f]{2}$/.test(joined.slice(i + 1, i + 3))) {
      bytes.push(parseInt(joined.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(ch.charCodeAt(0));
    }
  }
  try {
    return Buffer.from(bytes).toString("utf8");
  } catch {
    return joined;
  }
}

// Walks a multipart container, returning its immediate child parts.
function splitMultipart(body: string, boundary: string): string[] {
  const delimiter = `--${boundary}`;
  const parts: string[] = [];
  const segments = body.split(delimiter);
  for (const segment of segments) {
    const trimmed = segment.replace(/^\r?\n/, "");
    if (!trimmed || trimmed.startsWith("--")) continue; // preamble/epilogue/closing
    parts.push(trimmed);
  }
  return parts;
}

interface Collected {
  text: string;
  html: string;
}

function collectBodies(node: MimeNode, out: Collected): void {
  const contentType = (node.headers["content-type"] || "text/plain").toLowerCase();
  const encoding = node.headers["content-transfer-encoding"] || "";
  const charset = getCharset(node.headers["content-type"] || "");

  if (contentType.startsWith("multipart/")) {
    const boundary = getBoundary(node.headers["content-type"] || "");
    if (!boundary) return;
    for (const rawPart of splitMultipart(node.body, boundary)) {
      const { headerBlock, body } = splitHeadersAndBody(rawPart);
      collectBodies({ headers: parseHeaders(headerBlock), body }, out);
    }
    return;
  }

  const decoded = decodeTransfer(node.body, encoding, charset);
  if (contentType.startsWith("text/html")) {
    if (!out.html) out.html = decoded;
  } else if (contentType.startsWith("text/plain")) {
    if (!out.text) out.text = decoded;
  }
}

/**
 * Parses a raw RFC 822 email blob into its principal fields and bodies.
 * Prefers text/plain; the html field is returned sanitized.
 */
export function parseRawEmail(raw: string | Buffer): ParsedEmail {
  const rawStr = typeof raw === "string" ? raw : raw.toString("utf8");
  const { headerBlock, body } = splitHeadersAndBody(rawStr);
  const headers = parseHeaders(headerBlock);

  const collected: Collected = { text: "", html: "" };
  collectBodies({ headers, body }, collected);

  // A bare single-part message with no recognized content-type still has a body.
  if (!collected.text && !collected.html) {
    const contentType = (headers["content-type"] || "text/plain").toLowerCase();
    const decoded = decodeTransfer(body, headers["content-transfer-encoding"] || "", getCharset(headers["content-type"] || ""));
    if (contentType.startsWith("text/html")) collected.html = decoded;
    else collected.text = decoded;
  }

  return {
    from: headers["from"] || "",
    to: headers["to"] || "",
    subject: headers["subject"] || "",
    date: headers["date"] || "",
    messageId: headers["message-id"] || "",
    text: collected.text,
    html: collected.html ? sanitizeHtml(collected.html) : "",
  };
}

/**
 * Removes dangerous markup from an HTML email body so it is safe to render in
 * the provider inbox: strips <script>/<style>/<iframe> blocks, inline on*=
 * event-handler attributes, and javascript:/data: URLs.
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string" || !html) return "";
  let out = html;
  // Drop whole dangerous elements (with their content).
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "");
  // Drop any stray opening/closing tags of those elements that lacked a match.
  out = out.replace(/<\/?(?:script|style|iframe)\b[^>]*>/gi, "");
  // Strip inline event-handler attributes: on...="..." / on...='...' / on...=value
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  // Neutralize javascript: and data: URLs in href/src attributes.
  out = out.replace(/(href|src)\s*=\s*"(?:\s*(?:javascript|data):)[^"]*"/gi, '$1="#"');
  out = out.replace(/(href|src)\s*=\s*'(?:\s*(?:javascript|data):)[^']*'/gi, "$1='#'");
  out = out.replace(/(href|src)\s*=\s*(?:javascript|data):[^\s>]+/gi, '$1="#"');
  return out;
}
