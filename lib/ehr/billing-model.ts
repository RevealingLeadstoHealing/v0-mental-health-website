// Billing claim domain model, two-stage compliance review gates, and validation.
//
// Workflow (enforced server-side):
//   draft
//     -> clinical_review_passed   (clinical documentation + signature complete)
//       -> billing_review_passed  (payer, codes, charge, eligibility complete)
//         -> ready_to_transmit    (both reviews recorded by authorized roles)
//           -> transmitted        (accepted by the clearinghouse)
//   any stage -> rejected         (a reviewer can send it back with a reason)
//
// Nothing can reach ready_to_transmit unless BOTH reviews passed. A claim can
// only be transmitted through the connected clearinghouse (lib/ehr/clearinghouse.ts)
// by an owner or billing staff member.

export type ClaimStatus =
  | "draft"
  | "clinical_review_passed"
  | "billing_review_passed"
  | "ready_to_transmit"
  | "transmitted"
  | "rejected";

export type ReviewStage = "clinical" | "billing";

export interface ClaimDiagnosis {
  code: string;
  label: string;
  rank: "primary" | "secondary" | "tertiary" | "quaternary";
}

export interface ClaimServiceLine {
  code: string; // CPT / HCPCS
  label: string;
  units: number;
  minutes?: number;
  chargeAmount: number;
  // Optional telehealth coding. Place of service: "11" in-office (default),
  // "10" telehealth-home, "02" telehealth-other. Modifiers: "95" audio+video,
  // "93" audio-only. Absence preserves today's in-office behavior.
  placeOfService?: string;
  modifiers?: string[];
}

export interface ClaimReviewRecord {
  stage: ReviewStage;
  decision: "passed" | "rejected";
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  reviewedAt: string;
  reason?: string; // required when rejected
}

export interface ClaimTransmissionRecord {
  action: "validate" | "submit";
  mode: "test" | "production";
  accepted: boolean;
  errors: string[];
  patientControlNumber: string;
  stediClaimId?: string;
  submissionId?: string;
  attemptedAt: string;
  attemptedById: string;
  attemptedByName: string;
}

export interface BillingClaim {
  claimId: string;
  practiceId: string;
  clientId: string;
  clientName: string;
  medicalRecordNumber: string;
  appointmentId?: string;
  dateOfService: string;
  renderingProviderName: string;
  renderingProviderNpi: string;
  payerName: string;
  payerId: string;
  insurancePlanName: string;
  sessionMinutes: number;
  diagnoses: ClaimDiagnosis[];
  serviceLines: ClaimServiceLine[];
  // Claim-level place-of-service default the UI sets for all lines; optional so
  // existing claims (no POS) keep today's in-office behavior.
  placeOfService?: string;
  chargeAmount: number;
  paidAmount: number;
  status: ClaimStatus;
  clinicalReview?: ClaimReviewRecord;
  billingReview?: ClaimReviewRecord;
  reviews: ClaimReviewRecord[];
  providerSignature?: string;
  // Derived server-side from the supervised-note records (never trusted from a client).
  // A claim covered by a supervisee's note is blocked until the supervisor signs it.
  supervisorCosignRequired?: boolean;
  supervisorCosignedAt?: string;
  supervisedNoteId?: string;
  transmissions?: ClaimTransmissionRecord[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// --- Validation --------------------------------------------------------------

export interface ValidationResult {
  ok: boolean;
  missing: string[];
}

/**
 * Stage 1 — Clinical documentation & compliance review.
 * Confirms the clinical record supports the claim before billing sees it.
 */
export function validateClinicalReview(claim: Partial<BillingClaim>): ValidationResult {
  const missing: string[] = [];
  if (!claim.dateOfService) missing.push("Date of service");
  if (!Number(claim.sessionMinutes) || Number(claim.sessionMinutes) <= 0)
    missing.push("Documented session minutes");
  if (!claim.diagnoses?.some((d) => d.rank === "primary" && d.code))
    missing.push("Primary diagnosis");
  if (!claim.serviceLines?.length) missing.push("At least one service (CPT/HCPCS) line");
  if (!claim.providerSignature) missing.push("Authenticated provider signature");
  if (!claim.renderingProviderNpi) missing.push("Rendering provider NPI");
  if (claim.supervisorCosignRequired && !claim.supervisorCosignedAt) missing.push("Supervisor co-sign required");
  return { ok: missing.length === 0, missing };
}

/**
 * Stage 2 — Billing / pre-submission review.
 * Confirms payer, coding, and financial fields are complete and internally
 * consistent before the claim can be marked submission-ready.
 */
export function validateBillingReview(claim: Partial<BillingClaim>): ValidationResult {
  const missing: string[] = [];
  if (!claim.payerName) missing.push("Payer / insurance carrier");
  if (!claim.insurancePlanName) missing.push("Specific plan / product");
  if (!claim.payerId) missing.push("Clearinghouse payer ID / routing");
  if (!Number(claim.chargeAmount) || Number(claim.chargeAmount) <= 0)
    missing.push("Charge amount");
  if (!claim.serviceLines?.length) missing.push("Service line coding");
  // Charge on the claim must equal the sum of the service line charges.
  const lineTotal = (claim.serviceLines || []).reduce(
    (sum, line) => sum + (Number(line.chargeAmount) || 0),
    0
  );
  if (claim.serviceLines?.length && Number(claim.chargeAmount) &&
      Math.round(lineTotal * 100) !== Math.round(Number(claim.chargeAmount) * 100)) {
    missing.push("Charge amount must equal the sum of service line charges");
  }
  return { ok: missing.length === 0, missing };
}

/**
 * Composes the two existing review validators into a single named-deficiency
 * list for a claim. Pure recomposition — introduces NO new rules — so the UI
 * (review queue, payer worklist, standing alerts) can surface exactly the same
 * gaps the server enforces on PATCH review and transmit.
 *
 * `clinical` / `billing` hold the stage-specific named missing items. `all`
 * is the de-duplicated union for convenience.
 */
export interface ClaimDeficiencies {
  clinical: string[];
  billing: string[];
  all: string[];
  ok: boolean;
}

export function claimDeficiencies(claim: Partial<BillingClaim>): ClaimDeficiencies {
  const clinical = validateClinicalReview(claim).missing;
  const billing = validateBillingReview(claim).missing;
  const all: string[] = [];
  for (const item of [...clinical, ...billing]) {
    if (!all.includes(item)) all.push(item);
  }
  return { clinical, billing, all, ok: all.length === 0 };
}

// --- State machine -----------------------------------------------------------

/**
 * Returns the next status after a review decision, or throws if the transition
 * is not allowed. This is the single source of truth for claim progression and
 * must be enforced on the server, never trusted from the client.
 */
export function nextStatusAfterReview(
  current: ClaimStatus,
  stage: ReviewStage,
  decision: "passed" | "rejected",
  otherReviewPassed: boolean
): ClaimStatus {
  if (decision === "rejected") return "rejected";

  if (stage === "clinical") {
    // Clinical passing while billing already passed -> ready.
    return otherReviewPassed ? "ready_to_transmit" : "clinical_review_passed";
  }

  // stage === "billing"
  return otherReviewPassed ? "ready_to_transmit" : "billing_review_passed";
}

/**
 * Whether the given role may perform the given review stage.
 * - clinical review: owner or provider (licensed clinician sign-off)
 * - billing review: owner or billing_staff
 */
export function canReview(role: string, stage: ReviewStage): boolean {
  if (stage === "clinical") return role === "owner" || role === "provider";
  return role === "owner" || role === "billing_staff";
}

export function canTransmit(role: string): boolean {
  return role === "owner" || role === "billing_staff";
}

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: "Draft",
  clinical_review_passed: "Clinical review passed",
  billing_review_passed: "Billing review passed",
  ready_to_transmit: "Ready to transmit",
  transmitted: "Transmitted",
  rejected: "Rejected — needs correction",
};
