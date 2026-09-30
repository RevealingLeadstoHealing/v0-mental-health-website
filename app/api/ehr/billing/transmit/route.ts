import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../../lib/ehr/auth";
import { requireClientAccess } from "../../../../../lib/ehr/authorization";
import { appendAuditEvent, getClientProfile } from "../../../../../lib/ehr/dynamodb-store";
import { getBillingClaim, recordClaimTransmission } from "../../../../../lib/ehr/billing-store";
import {
  canTransmit,
  validateBillingReview,
  validateClinicalReview,
  type BillingClaim,
  type ClaimTransmissionRecord,
} from "../../../../../lib/ehr/billing-model";
import {
  buildConnectionCheckClaim,
  buildProfessionalClaimSubmission,
  patientBillingDetailsFromProfile,
  patientControlNumberForClaim,
  submitProfessionalClaim,
  validateProfessionalClaim,
  type ClearinghouseResult,
} from "../../../../../lib/ehr/clearinghouse";
import { loadClearinghouseConfig } from "../../../../../lib/ehr/clearinghouse-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

async function requireConfig() {
  const result = await loadClearinghouseConfig();
  if (!result.config) throw new ApiError(503, result.reason || "No clearinghouse is connected.");
  return result.config;
}

async function callStedi<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw new ApiError(502, error instanceof Error ? error.message : "The clearinghouse request failed.");
  }
}

// ---------------------------------------------------------------------------
// GET — clearinghouse connection status (no secrets returned)
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "billing_staff", "auditor"]);
    const result = await loadClearinghouseConfig().catch(() => ({
      config: undefined,
      reason: "The clearinghouse secret could not be read.",
    }));
    return NextResponse.json(
      result.config
        ? { connected: true, clearinghouse: "Stedi", mode: result.config.mode }
        : { connected: false, clearinghouse: "Stedi", reason: result.reason },
      { headers: noStore }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// POST — connection check, claim validation, or claim submission
//   { action: "connection-check" }                       synthetic claim, validate only
//   { action: "validate" | "submit", claimId, dateOfService }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    if (!canTransmit(actor.role)) {
      throw new ApiError(403, "Only an owner or billing staff member can send claims to the clearinghouse.");
    }
    const body = await request.json();
    const action = body.action;
    const config = await requireConfig();

    if (action === "connection-check") {
      const today = new Date().toISOString().slice(0, 10);
      const { claim, patient } = buildConnectionCheckClaim(config.billingProvider, today);
      const payload = buildProfessionalClaimSubmission(claim, patient, config.billingProvider);
      const result = await callStedi(() => validateProfessionalClaim(payload, config.apiKey));
      await appendAuditEvent(actor, {
        action: "Ran clearinghouse connection check",
        category: "Billing",
        entityType: "clearinghouse",
        entityId: "stedi",
        summary: `Stedi validation of a synthetic test claim ${result.accepted ? "passed" : "returned edits"} (${config.mode} mode). No claim was submitted.`,
      });
      return NextResponse.json({ mode: config.mode, ...result }, { headers: noStore });
    }

    if (action !== "validate" && action !== "submit") {
      throw new ApiError(400, "action must be 'connection-check', 'validate', or 'submit'.");
    }
    const claimId = typeof body.claimId === "string" ? body.claimId : "";
    const dateOfService = typeof body.dateOfService === "string" ? body.dateOfService : "";
    if (!claimId || !dateOfService) throw new ApiError(400, "claimId and dateOfService are required.");

    const claim = await getBillingClaim(actor.practiceId, dateOfService, claimId);
    if (!claim) throw new ApiError(404, "Claim was not found.");
    await requireClientAccess(actor, claim.clientId);

    if (claim.status !== "ready_to_transmit") {
      throw new ApiError(409, "Only a claim that passed both clinical and billing review can be sent.");
    }
    const reviewGaps = [...validateClinicalReview(claim).missing, ...validateBillingReview(claim).missing];
    if (reviewGaps.length) throw new ApiError(422, `Claim is incomplete: ${reviewGaps.join(", ")}.`);
    if (config.mode !== "production") {
      throw new ApiError(
        409,
        "The clearinghouse is connected in test mode. Real patient claims can only be sent after the Stedi account is switched to a production API key."
      );
    }

    const profile = await getClientProfile(actor.practiceId, claim.clientId);
    if (!profile) throw new ApiError(404, "Client chart was not found.");
    const { patient, missing } = patientBillingDetailsFromProfile(profile);
    if (missing.length) {
      throw new ApiError(422, `Add to the patient's demographics before sending: ${missing.join(", ")}.`);
    }

    const payload = buildProfessionalClaimSubmission(claim, patient, config.billingProvider);
    const result: ClearinghouseResult = await callStedi(() =>
      action === "submit"
        ? submitProfessionalClaim(payload, config.apiKey, claim.claimId)
        : validateProfessionalClaim(payload, config.apiKey)
    );

    const transmission: ClaimTransmissionRecord = {
      action,
      mode: config.mode,
      accepted: result.accepted,
      errors: result.errors,
      patientControlNumber: patientControlNumberForClaim(claim.claimId),
      ...(result.stediClaimId ? { stediClaimId: result.stediClaimId } : {}),
      ...(result.submissionId ? { submissionId: result.submissionId } : {}),
      attemptedAt: new Date().toISOString(),
      attemptedById: actor.sub,
      attemptedByName: actor.name,
    };
    const newStatus = action === "submit" ? (result.accepted ? "transmitted" : "rejected") : undefined;
    await recordClaimTransmission(actor.practiceId, dateOfService, claimId, transmission, newStatus);

    await appendAuditEvent(actor, {
      action:
        action === "submit"
          ? result.accepted
            ? "Transmitted claim to clearinghouse"
            : "Clearinghouse rejected claim"
          : "Validated claim with clearinghouse",
      category: "Billing",
      clientId: claim.clientId,
      entityType: "billing-claim",
      entityId: claimId,
      summary:
        action === "submit"
          ? result.accepted
            ? `Claim sent to ${claim.payerName} through Stedi (Stedi claim ${result.stediClaimId || "pending"}).`
            : `Stedi rejected the claim with ${result.errors.length} edit(s); it was not sent to the payer.`
          : `Stedi validation ${result.accepted ? "passed" : `returned ${result.errors.length} edit(s)`}. Nothing was sent to the payer.`,
    });

    const updated: BillingClaim = {
      ...claim,
      ...(newStatus ? { status: newStatus } : {}),
      transmissions: [...(claim.transmissions || []), transmission],
    };
    return NextResponse.json({ claim: updated, result }, { headers: noStore });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
