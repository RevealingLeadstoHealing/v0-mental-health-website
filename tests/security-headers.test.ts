import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config.js";

test("all application routes receive production browser security headers", async () => {
  const rules = await nextConfig.headers();
  assert.equal(rules.length, 1);
  assert.equal(rules[0].source, "/:path*");
  const headers = new Map(rules[0].headers.map((header: { key: string; value: string }) => [header.key, header.value]));
  for (const required of [
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Content-Security-Policy",
  ]) assert.ok(headers.has(required), `${required} is required`);
  assert.ok((headers.get("Content-Security-Policy") || "").includes("wss://*.chime.aws"));
  assert.match(headers.get("Content-Security-Policy") || "", /frame-ancestors 'none'/);
  assert.match(headers.get("Content-Security-Policy") || "", /connect-src 'self' https:\/\/\*\.amazonaws\.com/);
});
