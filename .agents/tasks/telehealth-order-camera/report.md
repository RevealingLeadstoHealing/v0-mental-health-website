# Telehealth order, camera, layout, consent wording

Nothing was built or run: Node/tsc are not installed here. All checks were by reading the code. Test on the live site after Amplify deploys.

## Issue 1 - Page order
Cause: the "Microphone and recording" block was written above the "In-EHR audio and video room" component.
Change: moved the room component above the recording block (one line moved in `app/ehr/full-production-interface.tsx`). Order is now: client/appointment/consents, video room and camera, recording, captions, transcript. No state, props, consent gating or disabled conditions changed. Mic-only recording still works without joining the room (its Start button never depended on the room).

## Issue 2 - Black camera
I could not run a browser, so I cannot say with certainty which one caused it. The code showed these real defects, all fixed in `app/ehr/native-telehealth-room.tsx`:
- Joining asked the browser for microphone permission only, then listed cameras. Browsers hide camera ids until camera permission is granted, so the camera start could fail. Any failure was swallowed and only a short line at the top said "Camera unavailable", so you saw nothing useful. Now the camera permission is requested first, and a clear amber message appears.
- The local video tile was started before the call had connected. It now starts once the call connects.
- The preview never called play() explicitly, and the preview box was a plain dark box before anything was on. It now plays explicitly and says the dark box is normal until Preview is pressed.
- New clear messages for: permission blocked, no camera found, camera in use by another app.
CSP was checked: `media-src 'self' blob:` and `Permissions-Policy: camera=(self)` do not block camera streams (srcObject is not governed by media-src). Not changed.
Could not verify: that the video now shows. If it is still black, the new message should say why (most likely browser camera permission).

## Issue 3 - Two screens
Plain language: in the current code there is only one telehealth page, but its "Microphone test" mode started switched ON by default, and the "Reset microphone test" button switched it back ON. So the page opened in test mode, and the test-mode wording was what you saw after stopping/refreshing. I found no localStorage/sessionStorage or second component for this. The version with an acknowledgement checkbox and AWS status boxes is most likely an older deployed version you got on one load while Amplify was mid-deploy (or a cached copy). I cannot confirm that from the code. The client-side room also has its own consent checkboxes, which only show in the client's view.
Change: microphone test mode now defaults OFF, is labelled "Optional: use microphone test mode", and the Reset button shows only while test mode is on. Nothing switches the mode after stopping. The safety rule is untouched: in test mode, notes, merges and saves stay blocked.

## Issue 4 - Consent wording
How they are recorded: both are checkboxes the provider ticks for this session (nothing is stored differently between them). The real consent documents (Telehealth Consent, Recording and AI Scribe Consent) are signed at intake. So both labels now say signed/on file:
- "Telehealth consent on file (signed at intake) - confirmed for this session"
- "Recording and AI transcription consent on file (signed at intake) - confirmed for this session"
Also reworded the "Check Recording consent obtained above" hint to match. Only text changed.
Left alone (stored data): the editable default consent verbiage text still says "Client provided verbal consent..." because it is saved with the session record; changing it would change stored content. It sits under "Review or edit consent wording" if you want it changed.
