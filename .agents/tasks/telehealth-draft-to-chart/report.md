# Telehealth AI draft to chart handoff

## What each button did before
- Generate mapped note draft: builds the structured draft (SOAP etc.) from the transcript. No chart change.
- Merge to EHR fields (mergeScribeToEhr): required chief complaint, minutes, primary diagnosis and CPT. Saved an unsigned note (signature null, with minutes and codes) into the client's `notes`. Biopsychosocial/intake templates also wrote intake fields. Treatment Plan Update also wrote a plan. Risk flags created a draft document. Stayed on Telehealth.
- Save generated draft to chart and Save structured draft to chart: same handler (saveStructuredDraftToChart). Saved a note into `notes` with no signature, minutes or codes. Stayed on Telehealth.
- pushToProgressNotes: defined but not connected to any button (dead code). Left in place.
- pushToIntake ("Save to Biopsychosocial"): unchanged.

The note did land in the client's `notes` list, which Follow-Up Notes shows. But Follow-Up Notes was a write-only form plus a read-only list. It defaulted to the first client in the list (not the active telehealth client), showed no unsigned marker, and had no way to open a saved draft for editing. That is why she could not find or finish it.

## What changed (all in app/ehr/full-production-interface.tsx)
- One primary button: "Save reviewed draft and open in client's progress note" (next to the review checkbox, still disabled until the checkbox is ticked and in microphone test mode). It uses the existing save handler, which now also stores session minutes, the code fields from the page, and `signature: null`.
- Removed the duplicate top button "Save generated draft to chart" (same handler as the primary). "Merge to EHR fields" is kept and relabeled "(needs diagnosis and CPT)" since it still enforces those fields.
- After a successful save or merge, for non-intake templates, the page goes to Follow-Up Notes (`notes`) for that client with the draft id. Intake-type templates (biopsychosocial routing) do not navigate and are otherwise unchanged.
- ProgressNotesPage now: selects the target client, opens the draft in the editor (title, SOAP text, note type, linked appointmentId/status, session minutes, diagnosis/CPT/chief complaint if present, MSE blank for her to fill), and shows an amber "unsigned AI draft" banner. The save button reads "Sign and save note" and replaces the draft in place (same id) using the existing save/signing logic (provider signature, required-field checks). Nothing is auto-signed.
- Saved notes list now shows an "Unsigned draft" badge and "Open to complete and sign" button for any note without a signature, so drafts can be reopened later.
- Added "Telehealth" and "Audio Telehealth" to the treatment approach list so the draft's modality displays.

## Where the note lands
The client's Follow-Up Notes (ProgressNotesPage) saved notes list as an unsigned draft, and is opened in the editor right after saving.

## Not changed
Consent gating, authorization, recording/upload/HealthScribe, billing submission, microphone-test rule, review checkbox gate, pushToIntake.

## Not verified
- No build, tsc, lint or tests were run (Node/tsc not installed); verified by reading code only.
- Not run in a browser. The navigation relies on `setPage("notes", {clientId, noteId})` and an effect in ProgressNotesPage that waits for the note to appear in the store; behavior after the save-queue flush was not exercised live.
- The "Sign and save note" path reuses the existing save(), which signs with the typed provider signature. Its requirement for diagnosis and CPT is existing behavior.
- Saving a signed copy does not separately reconcile the Telehealth page's earlier `Saved to chart.` banner.
