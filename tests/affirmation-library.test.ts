import test from "node:test";
import assert from "node:assert/strict";
import { affirmationLibrary } from "../lib/ehr/affirmation-library.ts";

test("affirmation library is substantial, unique, and patient-readable", () => {
  assert.ok(affirmationLibrary.length >= 100);
  assert.equal(new Set(affirmationLibrary).size, affirmationLibrary.length);
  assert.ok(affirmationLibrary.every(item => item.length >= 20 && item.length <= 180));
});

test("affirmation library covers core supportive themes", () => {
  const text = affirmationLibrary.join(" ").toLowerCase();
  for (const theme of ["healing", "boundary", "grief", "identity", "caregiver", "hope", "body", "values"]) {
    assert.match(text, new RegExp(theme));
  }
});
