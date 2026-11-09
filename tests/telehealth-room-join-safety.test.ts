import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { shouldDiscardRecording, isStalePoll } from "../lib/ehr/recording-discard.ts";

const room = fs.readFileSync(new URL("../app/ehr/native-telehealth-room.tsx", import.meta.url), "utf8");

test("an unexpected Chime stop keeps its reason on screen and locks the status poll", () => {
  const stop = room.slice(room.indexOf("audioVideoDidStop"), room.indexOf("videoTileDidUpdate"));
  assert.match(stop, /joinErrorRef\.current = true/);
  assert.match(stop, /setNotice\(stopReason\)/);
  assert.match(stop, /setCameraNotice\(stopReason\)/);
  assert.match(stop, /onConnectionChange\?\.\(false\)/);
  assert.match(stop, /if \(session\.current !== meeting\) return;/);
});

test("a status response requested before the join cannot tear the call down", () => {
  assert.match(room, /joined\.current = true; joinedAt\.current = Date\.now\(\);/);
  assert.match(room, /joined\.current && !next\.active && !isStalePoll\(requestedAt, joinedAt\.current\)/);
});

test("every failed join path clears busy, reports connection false and shows a reason", () => {
  const join = room.slice(room.indexOf("async function join()"), room.indexOf("async function leave("));
  assert.match(join, /catch \(e: any\) \{ joinErrorRef\.current = true;[^]*disconnectLocal\(\);[^]*setNotice\(reason\); setCameraNotice\(`Could not join the room: \$\{reason\}`\)/);
  assert.match(join, /finally \{ setBusy\(false\); busyRef\.current = false; \}/);
  assert.match(room, /joined\.current = false; onConnectionChange\?\.\(false\);/);
});

test("in-room recording is discarded, not uploaded, when provider consent is withdrawn", () => {
  assert.match(room, /recordingConsentRef\.current = recordingConsent; providerConsentRef\.current = providerConsent; onRecordingReadyRef\.current = onRecordingReady;/);
  assert.match(room, /const discard = shouldDiscardRecording\(provider, discardOnStop\.current\);[^]*if \(discard\) \{[^}]*return; \}/);
  assert.match(room, /const ready = onRecordingReadyRef\.current;/);
});

test("room recorder still hands audio to the same parent upload used by the microphone scribe", () => {
  const parent = fs.readFileSync(new URL("../app/ehr/full-production-interface.tsx", import.meta.url), "utf8");
  assert.match(parent, /onRecordingReady=\{uploadAudioAndStartHealthScribe\}/);
  assert.match(parent, /await uploadAudioAndStartHealthScribe\(new Blob\(mediaChunksRef\.current/);
});

test("discard decision follows the withdrawal flag, not consent state at stop time", () => {
  assert.equal(shouldDiscardRecording(true, true), true);
  assert.equal(shouldDiscardRecording(true, false), false);
  assert.equal(shouldDiscardRecording(false, true), false);
});

test("a poll requested before the latest join is stale", () => {
  assert.equal(isStalePoll(100, 200), true);
  assert.equal(isStalePoll(200, 200), false);
  assert.equal(isStalePoll(300, 200), false);
});
