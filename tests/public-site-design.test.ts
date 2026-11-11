import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");
const chrome = read("app/site-chrome.tsx");
const nav = read("app/site-nav.tsx");
const css = read("app/globals.css");
const home = read("app/page.tsx");
const about = read("app/about-us/page.tsx");
const insurance = read("app/insurance/page.tsx");
const contact = read("app/contact/page.tsx");

test("every header menu link opens a page that exists", () => {
  const hrefs = [...chrome.matchAll(/\{ href: "([^"]+)", label: "[^"]+" \}/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, ["/", "/about-us", "/therapy-approach", "/insurance", "/faqs", "/contact"]);
  for (const href of hrefs) {
    const file = href === "/" ? "app/page.tsx" : `app${href}/page.tsx`;
    assert.ok(fs.existsSync(file), `${href} has no page at ${file}`);
  }
});

test("header marks the current page and keeps the EHR login link", () => {
  assert.match(nav, /aria-current=\{pathname === link\.href \? "page" : undefined\}/);
  assert.match(nav, /Client &amp; Provider Login/);
  assert.match(chrome, /<SiteHeaderBar links=\{NAV_LINKS\} loginUrl=\{EHR_LOGIN_URL\} \/>/);
});

test("header turns grey after scrolling, like the original site", () => {
  assert.match(nav, /window\.scrollY > 10/);
  assert.match(nav, /"header-bar is-scrolled"/);
  assert.match(css, /\.header-bar\.is-scrolled\{[^}]*background:var\(--header-scrolled\)/);
  assert.match(css, /--header-scrolled:#737373/);
});

test("logo banner uses the original proportions", () => {
  assert.match(css, /\.site-header\{[^}]*height:25\.2vw/);
  assert.match(css, /url\('\/rlth-logo\.png'\) 50% 50%\/max\(100vw,440px\) auto/);
  assert.doesNotMatch(home, /home-logo-hero/, "the old separate logo box is gone");
});

test("one gold is used for buttons and footer, old golds are gone", () => {
  assert.match(css, /--gold-bright:#ffc500/);
  assert.match(css, /\.button\{[^}]*background:var\(--gold-bright\)/);
  assert.match(css, /\.site-footer-inner\{[^}]*background:var\(--gold-bright\)/);
  assert.doesNotMatch(css, /#cc9e00|#EBC94E|champagne/i);
});

test("original fonts: Lato for text, Montserrat for headings, no Bevan", () => {
  assert.match(css, /body\{[^}]*font-family:"Lato"/);
  assert.match(css, /h1,h2,h3\{[^}]*font-family:"Montserrat"/);
  assert.doesNotMatch(css, /Bevan/);
});

test("licensure states are listed on Home and About", () => {
  const sentence = /Kenseener is currently licensed in New York, Florida, and Idaho, with applications pending in Vermont, Delaware, and Colorado\./;
  assert.match(home.replace(/\s+/g, " "), sentence);
  assert.match(about.replace(/\s+/g, " "), sentence);
});

test("insurance page uses the approved general wording and names no carriers", () => {
  const text = insurance.replace(/\s+/g, " ");
  assert.match(text, /We accept most major insurance plans\. Please contact us to confirm your coverage before your first visit\./);
  assert.match(text, /Self-pay and sliding-scale fees are available\./);
  assert.doesNotMatch(text, /Carelon|Anthem|Cigna|Aetna|Optum|Oxford|Oscar|Medicare Advantage/);
});

test("contact form boxes have a visible border", () => {
  assert.match(contact, /border: "1px solid var\(--text\)"/);
  assert.doesNotMatch(contact, /var\(--charcoal\)/);
  assert.match(css, /--text:#737373/);
});

function cspFor(nodeEnv: string): string {
  const script =
    "const c=require('./next.config.js');" +
    "c.headers().then(r=>process.stdout.write(r[0].headers.find(h=>h.key==='Content-Security-Policy').value))";
  return execFileSync(process.execPath, ["-e", script], { env: { ...process.env, NODE_ENV: nodeEnv } }).toString();
}

test("live site security rules stay strict; only local dev is relaxed", () => {
  const prod = cspFor("production");
  assert.match(prod, /script-src 'self' 'unsafe-inline'(;|$)/);
  assert.doesNotMatch(prod, /unsafe-eval/);
  assert.match(prod, /upgrade-insecure-requests/);

  const dev = cspFor("development");
  assert.match(dev, /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
  assert.doesNotMatch(dev, /upgrade-insecure-requests/);
});
