import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../../lib/ehr/auth";
import { requireClientAccess } from "../../../../../lib/ehr/authorization";
import { getDynamoDocumentClient } from "../../../../../lib/ehr/aws-runtime";
import { appendAuditEvent, getClientProfile } from "../../../../../lib/ehr/dynamodb-store";
import { loadClearinghouseConfig } from "../../../../../lib/ehr/clearinghouse-config";
import {
  buildEligibilityRequest,
  eligibilityNotes,
  eligibilitySubscriberFromProfile,
  eligibilityVerificationStatus,
  isValidPayerId,
  runEligibilityCheck,
} from "../../../../../lib/ehr/eligibility";
import { rlthAwsFoundation } from "../../../../../lib/rlth-aws-foundation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { clientId, payerId } — real-time payer eligibility check through Stedi.
// The result is written to the patient's insurance-verification fields.
export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "billing_staff"]);
    const body = await request.json();
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const payerId = typeof body.payerId === "string" ? body.payerId.trim().toUpperCase() : "";
    if (!clientId) throw new ApiError(400, "Patient record is required.");
    if (!isValidPayerId(payerId)) throw new ApiError(400, "Enter the insurer's electronic payer ID (letters and numbers only).");

    const configResult = await loadClearinghouseConfig().catch(() => ({ config: undefined, reason: "The clearinghouse secret could not be read." }));
    const config = configResult.config;
    if (!config) {
      throw new ApiError(503, `Real-time eligibility is not connected yet. ${configResult.reason || ""} Use manual verification for now.`.trim());
    }
    if (config.mode !== "production") {
      throw new ApiError(409, "Stedi is connected with a test key. Real patient eligibility checks need the production API key. Use manual verification for now.");
    }

    await requireClientAccess(actor, clientId);
    const profile = await getClientProfile(actor.practiceId, clientId);
    if (!profile) throw new ApiError(404, "Client chart was not found.");
    const { subscriber, missing } = eligibilitySubscriberFromProfile(profile);
    if (missing.length) throw new ApiError(422, `Add to the patient's demographics first: ${missing.join(", ")}.`);

    let summary;
    try {
      summary = await runEligibilityCheck(buildEligibilityRequest(payerId, config.billingProvider, subscriber), config.apiKey);
    } catch (error) {
      throw new ApiError(502, error instanceof Error ? error.message : "The eligibility request failed.");
    }

    const checkedAt = new Date().toISOString();
    const updates: Record<string, string> = {
      insurancePayerId: payerId,
      insuranceVerificationStatus: eligibilityVerificationStatus(summary),
      insuranceVerificationNotes: eligibilityNotes(summary, payerId, checkedAt),
      insuranceVerifiedAt: checkedAt,
      insuranceVerifiedBy: `${actor.name || "Staff"} (Stedi real-time eligibility)`,
    };
    const names: Record<string, string> = { "#updatedAt": "updatedAt" };
    const values: Record<string, unknown> = { ":updatedAt": checkedAt };
    const assignments = ["#updatedAt = :updatedAt"];
    Object.entries(updates).forEach(([field, value], index) => {
      names[`#f${index}`] = field;
      values[`:v${index}`] = value;
      assignments.push(`#f${index} = :v${index}`);
    });
    await getDynamoDocumentClient().send(new UpdateCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      Key: { PK: `PRACTICE#${actor.practiceId}#CLIENT#${clientId}`, SK: "PROFILE" },
      UpdateExpression: `SET ${assignments.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
    }));
    await appendAuditEvent(actor, {
      action: "Ran real-time insurance eligibility check",
      category: "Billing",
      clientId,
      entityType: "insurance-eligibility",
      entityId: summary.eligibilityCheckId || payerId,
      summary: `Stedi eligibility check for payer ${payerId}: ${updates.insuranceVerificationStatus}.`,
    });
    return NextResponse.json({ summary, updates }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
