import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { requireClientAccess } from "../../../../lib/ehr/authorization";
import { appendAuditEvent } from "../../../../lib/ehr/dynamodb-store";
import {
  applyClaimReview,
  createBillingClaim,
  getBillingClaim,
  listBillingClaims,
} from "../../../../lib/ehr/billing-store";
import {
  canReview,
  nextStatusAfterReview,
  validateBillingReview,
  validateClinicalReview,
  type BillingClaim,
  type ClaimDiagnosis,
  type ClaimReviewRecord,
  type ClaimServiceLine,
  type ReviewStage,
} from "../../../../lib/ehr/billing-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET — list all practice claims, or fetch one by dateOfService + claimId
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "billing_staff", "auditor"]);

    const url = new URL(request.url);
    const claimId = url.searchParams.get("claimId");
    const dateOfService = url.searchParams.get("dateOfService");

    if (claimId && dateOfService) {
      const claim = await getBillingClaim(actor.practiceId, dateOfService, claimId);
      if (!claim) throw new ApiError(404, "Claim was not found.");
      return NextResponse.json({ claim }, { headers: { "Cache-Control": "no-store" } });
    }

    const claims = await listBillingClaims(actor.practiceId);
    return NextResponse.json({ claims }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// POST — create a new claim draft
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "billing_staff"]);

    const body = await request.json();
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    if (!clientId) throw new ApiError(400, "clientId is required.");

    // Authorization: the actor must be allowed to access this client's chart.
    await requireClientAccess(actor, clientId);

    const diagnoses: ClaimDiagnosis[] = Array.isArray(body.diagnoses)
      ? body.diagnoses
          .filter((d: unknown) => d && typeof d === "object")
          .map((d: Record<string, unknown>) => ({
            code: String(d.code || "").slice(0, 20),
            label: String(d.label || "").slice(0, 300),
            rank: (["primary", "secondary", "tertiary"].includes(String(d.rank))
              ? d.rank
              : "primary") as ClaimDiagnosis["rank"],
          }))
      : [];

    const serviceLines: ClaimServiceLine[] = Array.isArray(body.serviceLines)
      ? body.serviceLines
          .filter((l: unknown) => l && typeof l === "object")
          .map((l: Record<string, unknown>) => ({
            code: String(l.code || "").slice(0, 20),
            label: String(l.label || "").slice(0, 300),
            units: Math.max(1, Number(l.units) || 1),
            minutes: l.minutes != null ? Number(l.minutes) : undefined,
            chargeAmount: Number(l.chargeAmount) || 0,
          }))
      : [];

    const claim = await createBillingClaim(actor, {
      clientId,
      clientName: String(body.clientName || "").slice(0, 200),
      medicalRecordNumber: String(body.medicalRecordNumber || "").slice(0, 40),
      appointmentId: typeof body.appointmentId === "string" ? body.appointmentId : "",
      dateOfService: String(body.dateOfService || "").slice(0, 10),
      renderingProviderName: String(body.renderingProviderName || "").slice(0, 200),
      renderingProviderNpi: String(body.renderingProviderNpi || "").slice(0, 20),
      payerName: String(body.payerName || "").slice(0, 200),
      payerId: String(body.payerId || "").slice(0, 60),
      insurancePlanName: String(body.insurancePlanName || "").slice(0, 200),
      sessionMinutes: Number(body.sessionMinutes) || 0,
      diagnoses,
      serviceLines,
      chargeAmount: Number(body.chargeAmount) || 0,
      providerSignature: String(body.providerSignature || "").slice(0, 200),
    });

    await appendAuditEvent(actor, {
      action: "Created billing claim draft",
      category: "Billing",
      clientId,
      entityType: "billing-claim",
      entityId: claim.claimId,
      summary: "A billing claim draft was created server-side. No claim was transmitted.",
    });

    return NextResponse.json({ claim }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// ---------------------------------------------------------------------------
// PATCH — record a review decision (clinical or billing) and advance status
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  try {
    const actor = await requireEhrActor(request);

    const body = await request.json();
    const claimId = typeof body.claimId === "string" ? body.claimId : "";
    const dateOfService = typeof body.dateOfService === "string" ? body.dateOfService : "";
    const stage = body.stage as ReviewStage;
    const decision = body.decision === "rejected" ? "rejected" : "passed";
    const reason = typeof body.reason === "string" ? body.reason.slice(0, 1000) : "";

    if (!claimId || !dateOfService) {
      throw new ApiError(400, "claimId and dateOfService are required.");
    }
    if (stage !== "clinical" && stage !== "billing") {
      throw new ApiError(400, "stage must be 'clinical' or 'billing'.");
    }
    if (!canReview(actor.role, stage)) {
      throw new ApiError(
        403,
        stage === "clinical"
          ? "Only an owner or provider can complete the clinical review."
          : "Only an owner or billing staff member can complete the billing review."
      );
    }
    if (decision === "rejected" && !reason.trim()) {
      throw new ApiError(400, "A reason is required when rejecting a claim.");
    }

    const claim = await getBillingClaim(actor.practiceId, dateOfService, claimId);
    if (!claim) throw new ApiError(404, "Claim was not found.");

    await requireClientAccess(actor, claim.clientId);

    if (claim.status === "transmitted") {
      throw new ApiError(409, "A transmitted claim can no longer be reviewed.");
    }

    // Server-side validation gate — a review cannot pass with missing fields.
    if (decision === "passed") {
      const result =
        stage === "clinical" ? validateClinicalReview(claim) : validateBillingReview(claim);
      if (!result.ok) {
        throw new ApiError(
          422,
          `${stage === "clinical" ? "Clinical" : "Billing"} review cannot pass. Missing: ${result.missing.join(", ")}.`
        );
      }
    }

    const review: ClaimReviewRecord = {
      stage,
      decision,
      reviewerId: actor.sub,
      reviewerName: actor.name,
      reviewerRole: actor.role,
      reviewedAt: new Date().toISOString(),
      ...(decision === "rejected" ? { reason } : {}),
    };

    // Determine whether the *other* review already passed.
    const otherPassed =
      stage === "clinical"
        ? claim.billingReview?.decision === "passed"
        : claim.clinicalReview?.decision === "passed";

    const newStatus = nextStatusAfterReview(claim.status, stage, decision, otherPassed);

    await applyClaimReview(actor.practiceId, dateOfService, claimId, {
      review,
      newStatus,
      ...(stage === "clinical" ? { clinicalReview: review } : { billingReview: review }),
    });

    await appendAuditEvent(actor, {
      action:
        decision === "passed"
          ? `Passed ${stage} review on billing claim`
          : `Rejected billing claim at ${stage} review`,
      category: "Billing",
      clientId: claim.clientId,
      entityType: "billing-claim",
      entityId: claimId,
      summary:
        decision === "passed"
          ? `${stage} review passed; claim advanced to ${newStatus}.`
          : `${stage} review rejected: ${reason}`,
    });

    const updated: BillingClaim = {
      ...claim,
      status: newStatus,
      reviews: [...(claim.reviews || []), review],
      ...(stage === "clinical" ? { clinicalReview: review } : { billingReview: review }),
    };

    return NextResponse.json({ claim: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
