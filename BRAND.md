# Revealing Leads to Healing Wellness Services, LLC — Brand Specification

**This is the single source of truth for the brand. It is a legal, copyrighted
design owned by the owner. Every surface — website, EHR, documents, emails —
must use the ORIGINAL 2023/24 brand exactly: layout, font, colors, style,
spacing, and logo (used exactly as the source file, transparent background,
no added border or decoration). No modification, reinterpretation, or
substitution — per the owner's direct instruction (Sept 12, 2026), any
deviation could require a new copyright application.**

**Per the owner's direct clarification on Sept 12, 2026, the original 2023/24
coding — champagne gold, charcoal grey, bright white, black, with Bevan
headings and Montserrat body — is the authoritative, copyrighted brand. This
supersedes any values sampled from the live Webador site's current computed
styles: the owner has stated the live site's present-day rendering does not
necessarily reflect the true original (the platform can drift over time), and
the original coding below is the source of truth for color and font. Layout
structure (hamburger nav opening a full-screen overlay, single-button CTAs,
plain unframed logo, page content/copy) was separately verified against the
live site and stays as-is — those are structural/content fixes, not
color/font choices, and are not in conflict with this palette.**

Owner: Kenseener Carpenter, MA, LCSW, CCTP, CGP, CASAC-M, IFSP, CIMHP
Practice: Revealing Leads to Healing Wellness Services, LLC

---

## Colors — original 2023/24 copyrighted brand (per owner's Sept 12, 2026 confirmation)

| Name              | Use                                                | Hex |
|-------------------|-----------------------------------------------------|-----|
| Champagne gold     | Buttons (solid pill, black text, black border), accents, active-nav-link border, footer title, top-bar border | `#EBC94E` |
| Charcoal grey       | Body/heading text, nav overlay background, footer background | `#3A3A3A` |
| Bright white        | Page background                                     | `#FFFFFF` |
| Black                | Button text, button border                          | `#111111` |

Note: earlier drafts of this file (dated the same day, superseded by this
version) briefly switched to values sampled from the live site's current
computed styles (`#FFC500` gold / `#202020` ink / `#F3F3F3` panel /
`#737373` nav overlay, Montserrat-only). That approach is now superseded —
the owner clarified directly that the champagne gold / charcoal / white /
black palette above, not whatever the live site presently renders, is the
true original copyrighted brand. Do not sample the live site for color again
without the owner's explicit say-so.

---

## Fonts — original 2023/24 copyrighted brand

| Role                        | Font                        | Weight / notes |
|-----------------------------|------------------------------|-----------------|
| Headings (h1, h2, h3)        | Bevan (Google Font)          | Weight 400. h1 2rem, h2 1.5rem, h3 1.2rem |
| Body, nav overlay links, buttons, top-bar brand name, field labels | Montserrat (Google Font) | Regular body text; nav overlay links use Bevan (see below) |
| Top-bar site name             | Bevan                        | 1.1rem |
| Nav overlay links             | Bevan                        | 1.2rem, gold border + gold text on the active page |

Note: an earlier draft of this file (superseded) stated Bevan was "not used
anywhere on the live site" and should not be reintroduced, based on the live
site's current computed `font-family`. That finding is now superseded by the
owner's direct confirmation that Bevan is part of the original copyrighted
brand and belongs in the rebuild regardless of what the live site currently
renders.

---

## Logo

- Round logo, transparent background PNG. Per the owner's precise Sept 12,
  2026 description: gold "R" and "H" script letters within the circle, with a
  feature between the two scripted letters that resembles a face. (Prior
  description in this file also noted "REVEALING LEADS TO HEALING" in
  charcoal and "COUNSELING & WELLNESS SERVICES, LLC" beneath, with a thin
  black circle border — retained here pending final visual confirmation
  against the actual `public/rlth-logo.png` file.)
- The circular shape and all internal detail are baked into the artwork
  itself, not CSS: render as a plain `<img>` with no `border-radius`, no
  border, and no added color ring or decoration of any kind.
- Displayed large (up to 500px wide) and centered below the top bar on the
  Home page only — it does not appear in the site header on other pages.
  Per the owner's Sept 12 confirmation, the logo is the dominant visual
  feature on the Home page — it stays large, and the headshot photo below
  it is deliberately smaller (see next section) so the logo remains dominant.
- File: `public/rlth-logo.png`. **Outstanding: this file has not yet been
  re-opened and visually re-confirmed against the owner's precise Sept 12
  description in this session — do that before treating it as verified.**

## Headshot photo (owner's photo, not the logo)

- Regular portrait size — 280px wide, not the same large scale as the logo.
  The owner clarified (Sept 12) that an oversized photo reads as vain and
  that the logo, not her photo, should be the dominant feature on the page.
- No added border, border-radius, or decoration — plain image, same
  treatment philosophy as the logo.

## EHR access QR code (Contact page)

- Rendered at 200px — a normal, standard QR code display size. This was
  never affected by the earlier oversized-photo bug (that bug was a missing
  CSS max-width reset on `<img>` tags; the QR code has always used an
  explicit fixed width/height). Confirmed normal per the owner's Sept 12
  request.

---

## Owner name & credentials (use exactly as the live site states them)

- Live site heading: "Meet Kenseener Carpenter, MA, LCSW, CCTP. CGP, CASAC-M"
  (verbatim, including the period after CCTP as it appears live). No "Kay" in
  quotes in this heading — "Kay" is used only in the body text as her known
  name. Per the owner's Sept 11 instruction, IFSP and CIMHP are appended:
  "Meet Kenseener Carpenter, MA, LCSW, CCTP. CGP, CASAC-M, IFSP, CIMHP."
- Do not add SIFI to this heading — it is not present on the live site and
  was not part of the owner's explicit addition request. Flag to the owner
  if this seems like an omission; do not add it unilaterally.

## Content fidelity notes (verified against the live site; independent of the color/font palette above)

- The live Home page has a typo: "Wellness Servicces" (extra c) in the
  Therapy Approaches paragraph. Reproduced verbatim rather than silently
  corrected — the owner asked to be consulted before any text changes.
- Footer email is capitalized "Info@..." on the live site — reproduced as-is.
- Per the owner's Sept 12 request, `connect@rlth.org` (the already-verified
  SES sending address) is now listed FIRST wherever an email address
  appears — footer on every page, and the Location section on Contact —
  followed by the existing Info@ address. Format: "Email: connect@rlth.org
  · Info@revealing-leads-to-healing-wellness-services.org".
- Footer wording is "Office Location:" for the address line.
- Button text is exact: "Submit form" (contact forms), "Get Started" (About
  Us / Therapy Approach CTAs), "Schedule Now" (FAQs CTA). The About Us and
  Therapy Approach pages have only ONE button each (no EHR login button
  there) — the EHR login link(s) only appear on the Contact page.
- Contact page login buttons: "Existing Patient EHR Login" AND, per the
  owner's Sept 12 request, a second "Provider Login" button. Both point to
  the same shared `/login` page — the login system already determines
  provider vs. client role from the signed-in account, so a separate
  provider-only URL isn't needed; the two buttons just make it clear to a
  first-time visitor which one applies to them.
- FAQs page has a "Frequently asked questions" subheading directly above the
  list of questions.
- Main nav (hamburger menu) has exactly 5 items: Home, About Us, Therapy
  Approach, FAQs, Contact — no 6th "EHR Login" item. The current page's nav
  link gets a champagne-gold border box and gold text (active-page
  indicator).

## Content that must remain (owner's June/July 2026 updates)

- The June/July 2026 site changes STAY — made when the owner became fully
  licensed. This includes the profile picture and updated bio/credentials.
  Do NOT revert to the original 2024 Webador creation.
- **Music stays.** The uplifting songs are intentional, positive, and personally
  chosen by the owner. They are a deliberate part of the brand and patient
  experience — an intentionally curated playlist meant to create an atmosphere
  of peace and new beginnings. Keep the music feature.

## Areas of focus added September 11, 2026 (owner's direct instruction)

Somatic Therapy, Geriatric Mental Health, Sleep Disorders, Dementia &
Alzheimer's Support, Nutrition, Adolescent ADHD, ABA (Applied Behavior
Analysis), Dual Diagnosis. Listed exactly as given, no added description
invented. "Nutrition" flagged for the owner to confirm fits LCSW scope of
practice before wide publication.

## Rules

1. This is a copyrighted, legal brand. Color and font come from the original
   2023/24 coding (champagne gold `#EBC94E`, charcoal `#3A3A3A`, white
   `#FFFFFF`, black `#111111`, Bevan headings, Montserrat body) per the
   owner's direct Sept 12, 2026 confirmation — NOT from sampling the live
   site's current computed styles, which the owner has said may not reflect
   the true original. Layout structure and page content/copy ARE verified
   against the live site and should stay matched to it.
2. No color, font, spacing, or layout element may be substituted, added, or
   "improved" beyond what's documented here or verified against the live
   site's structure/content.
3. The owner's name, credentials, June/July updates, profile picture, and
   music are not to be changed or removed.
4. The EHR portal (login link, QR code) is a genuinely new functional
   addition beyond what Webador has — that's expected and approved, since
   Webador has no EHR. Keep new functional additions minimal and only where
   the owner has approved them (currently: the Contact page).
5. Any change to the brand is made HERE first, then propagated. If the
   owner gives a new, explicit instruction that conflicts with this file
   (as happened Sept 12, 2026 with the color/font palette), her most recent
   direct instruction wins — update this file to match rather than guessing
   or averaging between versions, and say plainly in the response that the
   file was updated because of a new instruction.
