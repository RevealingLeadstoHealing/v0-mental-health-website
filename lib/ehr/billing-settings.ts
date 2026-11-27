// Practice billing identity and telehealth claim-coding defaults.
//
// These values are the practice's CONFIRMED solo-individual (sole-proprietor)
// billing identity. They are the single source of truth for the claim's
// billing provider and rendering provider defaults, and are used server-side
// to fill any field the AWS Secrets Manager clearinghouse secret omits, so a
// claim is correct today even if the secret is incomplete.
//
// Override any field per deployment via the EHR_BILLING_* environment variables
// below — the identity is configurable, not hardcoded deep in logic.
//
// NOTE: The EIN / NPI / CAQH / license here are the owner's own registered
// practice identifiers, which the task explicitly provides to store on the
// claim. They are NOT credentials. The Stedi API key and the secret ARN are the
// only sensitive material and live ONLY in env / Secrets Manager, never here.

import type { BillingProviderConfig } from "./clearinghouse";

const env = (name: string, fallback: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

// Billing provider / organization identity (solo-individual defaults).
// `type2Npi` is intentionally empty: the owner is a sole proprietor with no
// separate Type 2 (organization) NPI, so the individual NPI is also the
// billing-provider NPI (see buildProfessionalClaimSubmission in clearinghouse.ts).
export const PRACTICE_BILLING_IDENTITY: BillingProviderConfig & { type2Npi: string } = {
  organizationName: env("EHR_BILLING_ORG_NAME", "REVEALING LEADS TO HEALING WELLNESS SERVICES, LLC"),
  npi: env("EHR_BILLING_NPI", "1417470964"),
  ein: env("EHR_BILLING_EIN", "873646733"),
  taxonomyCode: env("EHR_BILLING_TAXONOMY", "1041C0700X"),
  addressLine1: env("EHR_BILLING_ADDRESS1", "119 DeHaven Drive"),
  addressLine2: env("EHR_BILLING_ADDRESS2", "Unit 229"),
  city: env("EHR_BILLING_CITY", "Yonkers"),
  state: env("EHR_BILLING_STATE", "NY"),
  postalCode: env("EHR_BILLING_ZIP", "107030000"),
  // Practice billing phone (Spruce business line) — also the 837P submitter contact.
  phoneNumber: env("EHR_BILLING_PHONE", "9146352687"),
  // Solo / sole-proprietor: no separate organization (Type 2) NPI.
  type2Npi: env("EHR_BILLING_TYPE2_NPI", ""),
};

// Individual rendering provider identity (confirmed correct by the owner).
export const RENDERING_PROVIDER = {
  npi: env("EHR_BILLING_NPI", "1417470964"),
  license: env("EHR_BILLING_LICENSE", "103235"),
  taxonomyCode: env("EHR_BILLING_TAXONOMY", "1041C0700X"),
  caqhId: env("EHR_BILLING_CAQH", "14077537"),
};

// Telehealth CMS-1500 place-of-service codes.
//   11 = in-office (default, unchanged behavior)
//   10 = telehealth provided in the patient's home
//   02 = telehealth provided somewhere other than the patient's home
export const PLACE_OF_SERVICE = {
  inOffice: "11",
  telehealthHome: "10",
  telehealthOther: "02",
} as const;

// Telehealth CPT-line modifiers.
//   95 = synchronous telemedicine, audio + video
//   93 = synchronous telemedicine, audio only
export const TELEHEALTH_MODIFIERS = {
  video: "95",
  audioOnly: "93",
} as const;

export interface TelehealthCoding {
  placeOfService: string;
  modifiers: string[];
}

/**
 * Default place-of-service + modifier for a claim based on the linked
 * appointment's format. In-office / unknown keeps POS 11 with no modifier
 * (today's behavior); the provider can override per claim.
 *   Telehealth -> POS 10 (home) + modifier 95 (audio+video)
 *   Phone      -> POS 02 (other) + modifier 93 (audio-only)
 *   In Person / default -> POS 11, no modifier
 */
export function defaultTelehealthCoding(appointmentFormat?: string): TelehealthCoding {
  const format = (appointmentFormat || "").trim().toLowerCase();
  if (format === "telehealth") {
    return { placeOfService: PLACE_OF_SERVICE.telehealthHome, modifiers: [TELEHEALTH_MODIFIERS.video] };
  }
  if (format === "phone") {
    return { placeOfService: PLACE_OF_SERVICE.telehealthOther, modifiers: [TELEHEALTH_MODIFIERS.audioOnly] };
  }
  return { placeOfService: PLACE_OF_SERVICE.inOffice, modifiers: [] };
}
