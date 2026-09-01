export const demographicGroups = [
  { title: "Patient information", fields: [
    ["fullName", "Full name"], ["preferredName", "Preferred name"],
    ["firstName", "First name"], ["lastName", "Last name"],
    ["dateOfBirth", "Date of birth", "date"], ["sex", "Sex"],
  ] },
  { title: "Contact information", fields: [
    ["phone", "Phone", "tel"], ["contactEmail", "Contact email", "email"],
    ["addressLine1", "Street address"], ["addressLine2", "Apartment / unit"],
    ["city", "City"], ["state", "State"], ["zipCode", "ZIP code"],
    ["preferredLanguage", "Preferred language"],
  ] },
  { title: "Emergency contact", fields: [
    ["emergencyContactName", "Contact name"], ["emergencyContactRelationship", "Relationship"],
    ["emergencyContactPhone", "Contact phone", "tel"], ["emergencyContactEmail", "Contact email", "email"],
  ] },
  { title: "Primary care provider", fields: [
    ["primaryCareProviderName", "Provider name"], ["primaryCarePractice", "Practice"],
    ["primaryCarePhone", "Provider phone", "tel"], ["primaryCareAddress", "Practice address"],
  ] },
  { title: "Insurance information", fields: [
    ["insurancePayer", "Insurance carrier"], ["insurancePlanName", "Plan"],
    ["insuranceMemberId", "Member ID"], ["insuranceGroupNumber", "Group number"],
    ["insuranceNetworkStatus", "Network status"],
  ] },
] as const;

export const editableDemographicFields: readonly string[] = demographicGroups.flatMap(group => group.fields.map(field => field[0]));

export function patientAge(dateOfBirth: string, today = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return "Not entered";
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return "Invalid date";
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  if (age < 0 || dateOfBirth > `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`) return "Invalid date";
  return String(age);
}
