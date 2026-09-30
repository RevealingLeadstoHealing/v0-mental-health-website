// Stedi clearinghouse integration for 837P professional claims.
// Uses the Create/Validate Professional Claim (CMS-1500) JSON endpoints:
// https://www.stedi.com/docs/healthcare/api-reference/post-create-professional-claim-json

import { createHash } from "node:crypto";
import type { BillingClaim } from "./billing-model";

export const STEDI_CLAIMS_BASE_URL = "https://claims.us.stedi.com/2025-03-07";

export type ClearinghouseMode = "test" | "production";

export interface BillingProviderConfig {
  organizationName: string;
  npi: string;
  ein: string;
  taxonomyCode: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
}

export interface ClearinghouseConfig {
  apiKey: string;
  mode: ClearinghouseMode;
  billingProvider: BillingProviderConfig;
}

export interface PatientBillingDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "UNKNOWN";
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  memberId: string;
  groupNumber?: string;
}

export interface ClearinghouseResult {
  accepted: boolean;
  stediClaimId?: string;
  submissionId?: string;
  errors: string[];
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const digits = (value: unknown) => text(value).replace(/\D/g, "");

export function parseClearinghouseConfig(raw: string): { config?: ClearinghouseConfig; missing: string[] } {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { missing: ["Clearinghouse secret must be valid JSON"] };
  }
  const provider = (parsed.billingProvider && typeof parsed.billingProvider === "object"
    ? parsed.billingProvider
    : {}) as Record<string, unknown>;
  const billingProvider: BillingProviderConfig = {
    organizationName: text(provider.organizationName),
    npi: digits(provider.npi),
    ein: digits(provider.ein),
    taxonomyCode: text(provider.taxonomyCode).toUpperCase(),
    addressLine1: text(provider.addressLine1),
    addressLine2: text(provider.addressLine2) || undefined,
    city: text(provider.city),
    state: text(provider.state).toUpperCase(),
    postalCode: digits(provider.postalCode),
    phoneNumber: digits(provider.phoneNumber),
  };
  const mode = parsed.mode === "production" ? "production" : parsed.mode === "test" ? "test" : undefined;
  const missing: string[] = [];
  if (!text(parsed.apiKey)) missing.push("Stedi API key");
  if (!mode) missing.push('Mode ("test" or "production")');
  if (!billingProvider.organizationName) missing.push("Billing provider name");
  if (!/^\d{10}$/.test(billingProvider.npi)) missing.push("Billing provider NPI (10 digits)");
  if (!/^\d{9}$/.test(billingProvider.ein)) missing.push("Billing provider EIN (9 digits)");
  if (!/^[0-9A-Z]{9}X$/.test(billingProvider.taxonomyCode)) missing.push("Billing provider taxonomy code");
  if (!billingProvider.addressLine1 || !billingProvider.city) missing.push("Billing provider street address");
  if (!/^[A-Z]{2}$/.test(billingProvider.state)) missing.push("Billing provider state");
  if (!/^\d{9}$/.test(billingProvider.postalCode)) missing.push("Billing provider 9-digit ZIP code");
  if (!/^\d{10}$/.test(billingProvider.phoneNumber)) missing.push("Billing provider phone number");
  if (missing.length || !mode) return { missing };
  return { config: { apiKey: text(parsed.apiKey), mode, billingProvider }, missing };
}

export function genderFromSex(sex: unknown): PatientBillingDetails["gender"] {
  const value = text(sex).toLowerCase();
  if (value === "m" || value === "male") return "MALE";
  if (value === "f" || value === "female") return "FEMALE";
  return "UNKNOWN";
}

export function patientBillingDetailsFromProfile(profile: Record<string, unknown>): {
  patient: PatientBillingDetails;
  missing: string[];
} {
  const fullName = text(profile.fullName).split(/\s+/).filter(Boolean);
  const patient: PatientBillingDetails = {
    firstName: text(profile.firstName) || fullName.slice(0, -1).join(" "),
    lastName: text(profile.lastName) || fullName.slice(-1)[0] || "",
    dateOfBirth: text(profile.dateOfBirth),
    gender: genderFromSex(profile.sex),
    addressLine1: text(profile.addressLine1),
    addressLine2: text(profile.addressLine2) || undefined,
    city: text(profile.city),
    state: text(profile.state).toUpperCase(),
    postalCode: digits(profile.zipCode),
    memberId: text(profile.insuranceMemberId),
    groupNumber: text(profile.insuranceGroupNumber) || undefined,
  };
  const missing: string[] = [];
  if (!patient.firstName || !patient.lastName) missing.push("Patient first and last name");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(patient.dateOfBirth)) missing.push("Patient date of birth");
  if (patient.gender === "UNKNOWN") missing.push("Patient sex (Male or Female, as on the insurance card)");
  if (!patient.addressLine1 || !patient.city) missing.push("Patient street address");
  if (!/^[A-Z]{2}$/.test(patient.state)) missing.push("Patient state");
  if (!/^\d{5}(\d{4})?$/.test(patient.postalCode)) missing.push("Patient ZIP code");
  if (!patient.memberId) missing.push("Insurance member ID");
  return { patient, missing };
}

// Deterministic per claim so retries reuse the same PCN; 17 chars from the basic character set.
export function patientControlNumberForClaim(claimId: string): string {
  const hash = createHash("sha256").update(claimId).digest();
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let pcn = "";
  for (let index = 0; index < 17; index += 1) pcn += alphabet[hash[index] % alphabet.length];
  return pcn;
}

const icd = (code: string) => code.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
const money = (amount: number) => (Math.round(Number(amount) * 100) / 100).toFixed(2);

function splitProviderName(name: string) {
  const parts = name.replace(/,.*$/, "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.slice(-1)[0] || "" };
}

export function buildProfessionalClaimSubmission(
  claim: BillingClaim,
  patient: PatientBillingDetails,
  provider: BillingProviderConfig
) {
  const diagnosisCodes = [
    ...claim.diagnoses.filter((d) => d.rank === "primary"),
    ...claim.diagnoses.filter((d) => d.rank !== "primary"),
  ]
    .map((d) => icd(d.code))
    .filter(Boolean);
  const [primaryDiagnosisCode, ...additionalDiagnosisCodes] = diagnosisCodes;
  const address = (a: { addressLine1: string; addressLine2?: string; city: string; state: string; postalCode: string }) => ({
    addressLine1: a.addressLine1,
    ...(a.addressLine2 ? { addressLine2: a.addressLine2 } : {}),
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
  });
  return {
    purpose: "CHARGEABLE",
    authorization: {
      insuredAuthorizesAssignment: "YES",
      patientReleasesMedicalInfo: "YES",
      providerAcceptsAssignment: "ASSIGNED",
      providerSignature: "ON_FILE",
    },
    payer: { id: claim.payerId, name: { organization: claim.payerName } },
    insured: {
      name: { person: { firstName: patient.firstName, lastName: patient.lastName } },
      memberId: patient.memberId,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: address(patient),
      insuranceType: "OTHER",
      paymentResponsibilityLevelCode: "PRIMARY",
      ...(claim.insurancePlanName ? { planName: claim.insurancePlanName } : {}),
      ...(patient.groupNumber ? { policyOrGroupNumber: patient.groupNumber } : {}),
    },
    encounter: {
      primaryDiagnosisCode,
      ...(additionalDiagnosisCodes.length ? { additionalDiagnosisCodes } : {}),
    },
    billing: {
      billingProvider: {
        name: { organization: provider.organizationName },
        identifiers: { npi: provider.npi, taxonomyCode: provider.taxonomyCode },
        address: address(provider),
      },
      taxId: { ein: provider.ein },
      patientControlNumber: patientControlNumberForClaim(claim.claimId),
      totalCharge: money(claim.chargeAmount),
    },
    serviceLines: claim.serviceLines.map((line, index) => ({
      lineItemControlNumber: `${index + 1}`,
      datesOfService: { start: claim.dateOfService, end: claim.dateOfService },
      procedureCode: { code: line.code.trim().toUpperCase() },
      units: String(line.units || 1),
      lineItemChargeAmount: money(line.chargeAmount),
      diagnosisCodes: diagnosisCodes.slice(0, 4),
      renderingProvider: {
        name: { person: splitProviderName(claim.renderingProviderName) },
        identifiers: { npi: claim.renderingProviderNpi },
      },
    })),
    submitter: {
      name: { organization: provider.organizationName },
      contact: { phoneNumber: provider.phoneNumber },
    },
  };
}

// Synthetic, PHI-free claim used to verify the Stedi connection and practice billing setup.
export function buildConnectionCheckClaim(provider: BillingProviderConfig, today: string): {
  claim: BillingClaim;
  patient: PatientBillingDetails;
} {
  const claim: BillingClaim = {
    claimId: `connection-check-${today}`,
    practiceId: "connection-check",
    clientId: "connection-check",
    clientName: "Test Patient",
    medicalRecordNumber: "",
    dateOfService: today,
    renderingProviderName: "Test Provider",
    renderingProviderNpi: provider.npi,
    payerName: "Aetna",
    payerId: "60054",
    insurancePlanName: "Test Plan",
    sessionMinutes: 53,
    diagnoses: [{ code: "F41.1", label: "Generalized anxiety disorder", rank: "primary" }],
    serviceLines: [{ code: "90837", label: "Psychotherapy, 60 minutes", units: 1, minutes: 53, chargeAmount: 150 }],
    chargeAmount: 150,
    paidAmount: 0,
    status: "ready_to_transmit",
    reviews: [],
    createdAt: today,
    updatedAt: today,
    createdBy: "connection-check",
  };
  const patient: PatientBillingDetails = {
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-01-01",
    gender: "FEMALE",
    addressLine1: "1 Test Street",
    city: "New York",
    state: "NY",
    postalCode: "100010000",
    memberId: "TEST123456",
  };
  return { claim, patient };
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

async function stediErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string" && body.message) return body.message;
  } catch {
    // fall through to status text
  }
  return response.statusText || "Request failed";
}

function rejectionErrors(body: unknown): string[] {
  const errors = (body as { errors?: unknown })?.errors;
  if (!Array.isArray(errors)) return [];
  return errors.map((error) => text((error as { description?: unknown })?.description) || "Claim edit failed");
}

export async function validateProfessionalClaim(
  payload: ReturnType<typeof buildProfessionalClaimSubmission>,
  apiKey: string,
  fetchImpl: FetchLike = fetch
): Promise<ClearinghouseResult> {
  const response = await fetchImpl(`${STEDI_CLAIMS_BASE_URL}/professional-claim-submissions/validate`, {
    method: "POST",
    headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Stedi validation failed (HTTP ${response.status}): ${await stediErrorMessage(response)}`);
  }
  const errors = rejectionErrors(await response.json().catch(() => ({})));
  return { accepted: errors.length === 0, errors };
}

export async function submitProfessionalClaim(
  payload: ReturnType<typeof buildProfessionalClaimSubmission>,
  apiKey: string,
  idempotencyKey: string,
  fetchImpl: FetchLike = fetch
): Promise<ClearinghouseResult> {
  const response = await fetchImpl(`${STEDI_CLAIMS_BASE_URL}/professional-claim-submissions`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Stedi submission failed (HTTP ${response.status}): ${await stediErrorMessage(response)}`);
  }
  const body = (await response.json()) as { claimId?: unknown; submissionId?: unknown };
  const errors = rejectionErrors(body);
  return {
    accepted: errors.length === 0,
    stediClaimId: text(body.claimId) || undefined,
    submissionId: text(body.submissionId) || undefined,
    errors,
  };
}
