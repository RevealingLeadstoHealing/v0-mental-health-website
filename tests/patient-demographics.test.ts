import assert from "node:assert/strict";
import test from "node:test";
import { patientAge, editableDemographicFields } from "../lib/ehr/patient-demographics.ts";
test("age follows the birthday and accepts leap-day births", () => {
  assert.equal(patientAge("2000-09-02", new Date(2026, 8, 1)), "25");
  assert.equal(patientAge("2000-09-01", new Date(2026, 8, 1)), "26");
  assert.equal(patientAge("2000-02-29", new Date(2026, 8, 1)), "26");
});
test("missing, impossible, and future dates never produce a misleading age", () => {
  assert.equal(patientAge(""), "Not entered");
  assert.equal(patientAge("2025-02-29"), "Invalid date");
  assert.equal(patientAge("2030-01-01", new Date(2026, 8, 1)), "Invalid date");
});
test("demographic updates include optional contacts but exclude login identity and clinical content", () => {
  for (const key of ["contactEmail", "emergencyContactName", "emergencyContactRelationship", "primaryCareProviderName", "insurancePayer"]) assert.ok(editableDemographicFields.includes(key));
  for (const key of ["email", "role", "cognitoUserId", "chiefComplaint", "assessments", "assignedProviderIds"]) assert.ok(!editableDemographicFields.includes(key));
});
