import assert from "node:assert/strict";
import test from "node:test";
import { flushModuleSaves } from "../lib/ehr/flush-module-saves.ts";

test("blocks submission even when a failed save has already left the queue", async () => {
  await assert.rejects(flushModuleSaves(new Map(), new Map([["client-1:intake", new Error("offline")]]), "client-1"), /earlier chart save failed/);
});

test("waits for this patient's pending save and successful retry", async () => {
  const queues = new Map<string, Promise<unknown>>();
  const failures = new Map<string, unknown>([["client-1:intake", new Error("offline")]]);
  let finish!: () => void;
  queues.set("client-1:intake", new Promise<void>(resolve => { finish = resolve; }).then(() => {
    failures.delete("client-1:intake");
    queues.delete("client-1:intake");
  }));
  let completed = false;
  const submission = flushModuleSaves(queues, failures, "client-1").then(() => { completed = true; });
  await Promise.resolve();
  assert.equal(completed, false);
  finish();
  await submission;
  assert.equal(completed, true);
});

test("another patient's pending or failed saves do not block submission", async () => {
  await flushModuleSaves(new Map([["client-10:intake", new Promise(() => {})]]), new Map([["client-10:intake", "offline"]]), "client-1");
});
