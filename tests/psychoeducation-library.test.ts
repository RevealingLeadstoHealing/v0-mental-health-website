import assert from "node:assert/strict";
import test from "node:test";
import { psychoeducationLibrary } from "../lib/ehr/psychoeducation-library.ts";

test("psychoeducation library is substantial, unique, and contains usable education", () => {
  assert.ok(psychoeducationLibrary.length >= 30);
  assert.equal(new Set(psychoeducationLibrary.map(item => item.id)).size, psychoeducationLibrary.length);
  for (const item of psychoeducationLibrary) {
    assert.ok(item.title.length > 5);
    assert.ok(item.summary.length > 20);
    assert.ok(item.keyPoints.length >= 3);
    assert.ok(item.practice.length > 20);
  }
});

test("psychoeducation covers the practice's core populations and concerns", () => {
  const searchable = psychoeducationLibrary.map(item => `${item.topic} ${item.population} ${item.title}`).join(" ").toLowerCase();
  for (const term of ["trauma", "anxiety", "depression", "couples", "children", "adhd", "autism", "substance", "older adults", "caregiver", "military", "lgbtq+"]) {
    assert.ok(searchable.includes(term), `missing psychoeducation coverage for ${term}`);
  }
});
