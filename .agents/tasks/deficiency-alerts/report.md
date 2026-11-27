# Deficiency Alerts + Payer-Organized Worklist — Final Report

This feature does three things you asked for: it tells you by name what is wrong with a note or a claim, it takes you straight to the thing that needs fixing, and it organizes outstanding billing by payer so an alert lands on the right tab instead of you hunting for it. It was built on top of the review gates you already had, so nothing that used to block a bad note or claim changed.

Commit: `fd2304e` on branch `aws-ehr-production`. Docs only in this step; no feature code changed.

---

## Item 1 — NOTE DEFICIENCY ALERT

Status: **BUILT NOW** (the underlying field checks already existed; the standing alert and deep-link worklist are new).

Where it lives: `app/ehr/full-production-interface.tsx` — new `useDeficiencyWorklist` hook plus a standing red provider banner (a sibling of the existing booking-alerts banner).

How it names the deficiency: the hook scans each client's notes and flags any note that is not signed (no provider signature). It names the specific gap — "Signature missing", "Primary diagnosis required", "Billing CPT/HCPCS code required", "Session minutes required" — rather than a generic "incomplete" message.

How it deep-links: each alert row has a button that opens the exact note via `setPage("notes", { clientId, noteId })`, which focuses that note for completion and sign-off. No searching through folders.

Before this, the only note-level feedback was a transient toast at save time and an "Unsigned draft" badge; there was no persistent alert that named the gap and jumped to the note.

## Item 2 — BILLING DEFICIENCY ALERT

Status: **PARTIAL** — the validation that names every missing claim item already existed and was already enforced by the server; what was built now is surfacing that named list per claim (proactively) instead of only showing it as an error after a failed "Pass". No new billing rules were invented.

Where it lives:
- `lib/ehr/billing-model.ts` — new `claimDeficiencies(claim)` helper that composes the two existing validators (`validateClinicalReview` + `validateBillingReview`) into one named list. Single source of truth; no new rules.
- `app/ehr/full-production-interface.tsx` — the compliance review queue now renders, per claim, a red "needs before it can pass" list.

How it names the deficiency: each claim shows exactly what is missing — e.g. "Primary diagnosis", "At least one service (CPT/HCPCS) line", "Authenticated provider signature", "Rendering provider NPI", "Clearinghouse payer ID / routing", "Charge amount", "Service line coding", "Documented session minutes". Clinical gaps show until clinical review passes; billing gaps show until billing review passes. The last clearinghouse (Stedi) edit errors are appended when present.

How it deep-links: from the per-payer worklist (Item 3), the "Open to fix" button calls `setPage("billing", { clientId, claimId })`, which selects the client and scrolls the targeted claim card (`data-claim-id`) into view. For a signature-type gap it offers a jump to the note instead.

Why PARTIAL: the feature surfaces only the generic validators plus live Stedi edits. Payer-specific clean-claim rules are not included (see "Still needs data" below) — that is deliberate, not a gap in the build.

## Item 3 — PAYER-ORGANIZED WORKLIST

Status: **PARTIAL** — the payer grouping (NY/FL jurisdiction tabs → per-payer group tabs → ledger payer filter) already existed; what was built now is routing the real deficiency signal into that structure and adding a dedicated outstanding-by-payer worklist. No new payer rules.

Where it lives: `app/ehr/full-production-interface.tsx`, `BillingPage`.

How billing is grouped by payer:
- The new "Outstanding billing deficiencies by payer" card lists every server claim that still has a non-empty deficiency list, grouped under its payer. The grouping key is the claim's `payerGroupId`, falling back to `payerGroupFor(jurisdiction, payerName)` / `classifyBillingPayer(payerName)`, labeled from the payer catalog group or payer name. Each row names the client, date of service, payer product, and the specific missing items, with a deep-link to fix.
- The existing per-payer-group attention badges now also count server claims (matched to the group the same way) that have outstanding deficiencies or are not yet ready-to-transmit/transmitted — so the signal lands on the correct payer tab (e.g. an incomplete Aetna claim bumps the Aetna badge). The original local-snapshot count is kept, so nothing regressed.

Why PARTIAL: grouping and routing are complete, but the per-payer rules that would make the worklist payer-aware beyond the generic validators are not present (see below).

---

## Still needs real payer-rule data (later step)

The payer catalog organizes payers for selection only; it carries no per-payer claim rules (e.g. a specific Medicaid plan's required modifier, prior-authorization rule, or place-of-service rule). Those rules are not in the repo, and they were not invented here. The feature surfaces only the generic validators and the live clearinghouse (Stedi) edit errors.

When you supply verified per-payer rules, they can be added as data consumed by the same `claimDeficiencies` helper, and they will automatically flow into the per-claim list, the payer badges, and the standing alert — no rearchitecting needed. Until then, do not treat the absence of a payer-specific warning as "clean for that payer."

---

## Build / deploy verification

- Final Amplify job: **237** — app `d1mwc7x488m8xn`, branch `aws-ehr-production`, region us-east-1.
- Status: **SUCCEED** (started and ended 2026-11-05; commitId `fd2304ee16ac26777502c53f367c03bd83bfaf17`).
- Remote tip == HEAD: local `HEAD` = `origin/aws-ehr-production` = `fd2304e` (`fd2304ee16ac26777502c53f367c03bd83bfaf17`), matching the job 237 commitId. The deployed build is exactly this commit.

Node/tsc are not installed locally, so the Amplify build is the authoritative TypeScript/compile gate; job 237 passing confirms the change type-checks and builds.

---

## One end-to-end test (owner runs this)

1. Open a client and leave a progress note unsigned (do not sign it). Go to any page — the standing red worklist banner should show an alert naming the note's gap, e.g. "Signature missing".
2. Click that alert. It should land you directly on that note, focused for completion and sign-off (no searching).
3. Build a claim for a client but leave a required field out (e.g. no primary diagnosis, or no CPT/HCPCS line). Open the compliance review queue — that claim should show a red deficiency list naming the exact missing item (e.g. "Primary diagnosis" or "At least one service (CPT/HCPCS) line").
4. Open the "Outstanding billing deficiencies by payer" worklist — the deficient claim should appear grouped under its payer (and that payer's attention badge should be bumped). Click "Open to fix" and confirm it jumps to the right claim.

If each of those behaves as described, the feature is doing what you asked: name what's wrong, take me to it, and keep billing organized by payer.
