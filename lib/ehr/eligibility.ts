// Stedi real-time eligibility (270/271) using the JSON endpoint:
// https://www.stedi.com/docs/healthcare/api-reference/post-eligibility-check

export const STEDI_ELIGIBILITY_URL = "https://healthcare.us.stedi.com/2026-06-01/eligibility-check";

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface EligibilitySubscriber {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  memberId: string;
}

export interface EligibilitySummary {
  eligibilityCheckId: string;
  coverage: "active" | "inactive" | "unknown";
  planName: string;
  network: string;
  coPayments: string[];
  deductibles: string[];
  errors: string[];
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export function isValidPayerId(payerId: string) {
  return /^[A-Za-z0-9]{2,15}$/.test(payerId);
}

export function eligibilitySubscriberFromProfile(profile: Record<string, unknown>): {
  subscriber: EligibilitySubscriber;
  missing: string[];
} {
  const fullName = text(profile.fullName).split(/\s+/).filter(Boolean);
  const subscriber: EligibilitySubscriber = {
    firstName: text(profile.firstName) || fullName.slice(0, -1).join(" "),
    lastName: text(profile.lastName) || fullName.slice(-1)[0] || "",
    dateOfBirth: text(profile.dateOfBirth),
    memberId: text(profile.insuranceMemberId),
  };
  const missing: string[] = [];
  if (!subscriber.firstName || !subscriber.lastName) missing.push("Patient first and last name");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(subscriber.dateOfBirth)) missing.push("Patient date of birth");
  if (!subscriber.memberId) missing.push("Insurance member ID");
  return { subscriber, missing };
}

export function buildEligibilityRequest(
  payerId: string,
  provider: { organizationName: string; npi: string },
  subscriber: EligibilitySubscriber
) {
  return {
    payerId,
    provider: { name: { organization: provider.organizationName }, npi: provider.npi },
    subscriber: {
      name: { person: { firstName: subscriber.firstName, lastName: subscriber.lastName } },
      dateOfBirth: subscriber.dateOfBirth,
      memberId: subscriber.memberId,
    },
    encounter: { services: [{ system: "STC", value: "30" }] },
  };
}

function describeBenefit(entry: Record<string, unknown>, valueKey: "amount" | "percent") {
  const value = text(entry[valueKey]);
  if (!value) return "";
  const service = text(record(entry.service).definition) || "Plan";
  const network = text(record(entry.network).indicator).replace(/_/g, " ").toLowerCase();
  const formatted = valueKey === "amount" ? `$${value}` : `${value}%`;
  return `${service}: ${formatted}${network ? ` (${network})` : ""}`;
}

export function summarizeEligibilityResponse(body: unknown): EligibilitySummary {
  const response = record(body);
  const plans = list(response.plans);
  const benefits = plans.map((plan) => record(plan.benefits));
  const statuses = benefits.flatMap((item) => list(item.statuses));
  const coverage = statuses.some((item) => item.status === "ACTIVE_COVERAGE")
    ? "active"
    : statuses.length
      ? "inactive"
      : "unknown";
  const planName =
    plans.map((plan) => text(plan.name)).find(Boolean) ||
    statuses.map((item) => text(item.planCoverageDescription)).find(Boolean) ||
    "";
  const network = statuses.map((item) => text(record(item.network).indicator)).find(Boolean) || "";
  const coPayments = benefits.flatMap((item) => list(item.coPayment)).map((entry) => describeBenefit(entry, "amount")).filter(Boolean).slice(0, 5);
  const deductibles = benefits.flatMap((item) => list(item.deductible)).map((entry) => describeBenefit(entry, "amount")).filter(Boolean).slice(0, 5);
  const errors = list(response.errors).map((error) => {
    const code = text(error.code);
    const description = text(error.description) || "Payer rejected the eligibility request";
    const followup = text(error.followupAction);
    return `${code ? `${code}: ` : ""}${description}${followup ? ` — ${followup}` : ""}`;
  });
  return { eligibilityCheckId: text(response.id), coverage, planName, network, coPayments, deductibles, errors };
}

export function eligibilityVerificationStatus(summary: EligibilitySummary) {
  if (summary.errors.length || summary.coverage === "unknown") return "Pending";
  return summary.coverage === "active" ? "Verified" : "Not verified";
}

export function eligibilityNotes(summary: EligibilitySummary, payerId: string, checkedAt: string) {
  const lines = [
    `Real-time eligibility (Stedi 270/271), payer ID ${payerId}, ${checkedAt.slice(0, 10)}: ${
      summary.errors.length ? "payer returned errors" : `coverage ${summary.coverage}`
    }.`,
  ];
  if (summary.planName) lines.push(`Plan: ${summary.planName}.`);
  if (summary.network) lines.push(`Network: ${summary.network.replace(/_/g, " ").toLowerCase()}.`);
  if (summary.coPayments.length) lines.push(`Copays: ${summary.coPayments.join("; ")}.`);
  if (summary.deductibles.length) lines.push(`Deductibles: ${summary.deductibles.join("; ")}.`);
  if (summary.errors.length) lines.push(`Errors: ${summary.errors.join("; ")}.`);
  return lines.join(" ");
}

export async function runEligibilityCheck(
  request: ReturnType<typeof buildEligibilityRequest>,
  apiKey: string,
  fetchImpl: FetchLike = fetch
): Promise<EligibilitySummary> {
  const response = await fetchImpl(STEDI_ELIGIBILITY_URL, {
    method: "POST",
    headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = await response.json().catch(() => ({}));
  const summary = summarizeEligibilityResponse(body);
  if (!response.ok && !summary.errors.length) {
    const message = text(record(body).message) || `HTTP ${response.status}`;
    throw new Error(`Stedi eligibility check failed: ${message}`);
  }
  return summary;
}
