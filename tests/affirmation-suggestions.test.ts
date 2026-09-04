import test from "node:test";
import assert from "node:assert/strict";
import { chartInformedAffirmations } from "../lib/ehr/affirmation-suggestions.ts";

test("chart-informed affirmation drafts respond to documented clinical themes", () => {
  const grief = chartInformedAffirmations("bereavement and grief after a significant loss");
  const boundaries = chartInformedAffirmations("strengthen boundaries and assertive communication");
  assert.equal(grief.length, 6);
  assert.match(grief.join(" ").toLowerCase(), /grief|mourning|lost/);
  assert.match(boundaries.join(" ").toLowerCase(), /boundary|communicat|relationship/);
  assert.notDeepEqual(grief, boundaries);
});

test("chart-informed drafts stay bounded and fall back safely", () => {
  assert.equal(chartInformedAffirmations("", 100).length, 10);
  assert.equal(chartInformedAffirmations("", 0).length, 1);
});
