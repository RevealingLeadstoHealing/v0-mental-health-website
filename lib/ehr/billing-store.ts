import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { rlthAwsFoundation } from "../rlth-aws-foundation";
import { getDynamoDocumentClient } from "./aws-runtime";
import type { EhrActor } from "./auth";
import type { BillingClaim, ClaimReviewRecord, ClaimStatus } from "./billing-model";

// Claims are stored in the clinical records table using a dedicated key space:
//   PK = PRACTICE#{practiceId}#BILLING
//   SK = CLAIM#{dateOfService}#{claimId}
//   GSI1PK = CLIENT#{clientId}#BILLING   (per-client claim history)
//   GSI1SK = {createdAt}
// This keeps all practice claims queryable in one place and all of a client's
// claims queryable via the GSI, without adding a new table.

const TableName = () => rlthAwsFoundation.clinicalRecordsTableName;

function nowIso() {
  return new Date().toISOString();
}

function makeClaimId() {
  return `claim_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function claimKeys(practiceId: string, dateOfService: string, claimId: string) {
  return {
    PK: `PRACTICE#${practiceId}#BILLING`,
    SK: `CLAIM#${dateOfService || "0000-00-00"}#${claimId}`,
  };
}

export async function createBillingClaim(
  actor: EhrActor,
  input: Omit<
    BillingClaim,
    "claimId" | "practiceId" | "status" | "reviews" | "createdAt" | "updatedAt" | "createdBy" | "paidAmount"
  >
): Promise<BillingClaim> {
  const dynamo = getDynamoDocumentClient();
  const now = nowIso();
  const claimId = makeClaimId();

  const claim: BillingClaim = {
    ...input,
    claimId,
    practiceId: actor.practiceId,
    status: "draft",
    paidAmount: 0,
    reviews: [],
    createdAt: now,
    updatedAt: now,
    createdBy: actor.sub,
  };

  const keys = claimKeys(actor.practiceId, input.dateOfService, claimId);
  await dynamo.send(
    new PutCommand({
      TableName: TableName(),
      Item: {
        ...keys,
        GSI1PK: `CLIENT#${input.clientId}#BILLING`,
        GSI1SK: now,
        recordType: "billing-claim",
        ...claim,
      },
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );

  return claim;
}

export async function getBillingClaim(
  practiceId: string,
  dateOfService: string,
  claimId: string
): Promise<BillingClaim | null> {
  const dynamo = getDynamoDocumentClient();
  const result = await dynamo.send(
    new GetCommand({
      TableName: TableName(),
      Key: claimKeys(practiceId, dateOfService, claimId),
    })
  );
  return (result.Item as BillingClaim) || null;
}

export async function listBillingClaims(practiceId: string, limit = 200): Promise<BillingClaim[]> {
  const dynamo = getDynamoDocumentClient();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: TableName(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :claimPrefix)",
      ExpressionAttributeValues: {
        ":pk": `PRACTICE#${practiceId}#BILLING`,
        ":claimPrefix": "CLAIM#",
      },
      ScanIndexForward: false,
      Limit: Math.min(Math.max(limit, 1), 500),
    })
  );
  return (response.Items || []) as BillingClaim[];
}

/**
 * Record a review decision and advance the claim status.
 * The new status and the review record are computed by the caller (route)
 * using the billing-model state machine; this function only persists them
 * atomically with a condition that the claim still exists.
 */
export async function applyClaimReview(
  practiceId: string,
  dateOfService: string,
  claimId: string,
  params: {
    review: ClaimReviewRecord;
    newStatus: ClaimStatus;
    clinicalReview?: ClaimReviewRecord;
    billingReview?: ClaimReviewRecord;
  }
): Promise<void> {
  const dynamo = getDynamoDocumentClient();
  const now = nowIso();

  const setParts = [
    "#status = :status",
    "updatedAt = :now",
    "reviews = list_append(if_not_exists(reviews, :empty), :newReview)",
  ];
  const names: Record<string, string> = { "#status": "status" };
  const values: Record<string, unknown> = {
    ":status": params.newStatus,
    ":now": now,
    ":empty": [],
    ":newReview": [params.review],
  };

  if (params.clinicalReview) {
    setParts.push("clinicalReview = :clinicalReview");
    values[":clinicalReview"] = params.clinicalReview;
  }
  if (params.billingReview) {
    setParts.push("billingReview = :billingReview");
    values[":billingReview"] = params.billingReview;
  }

  await dynamo.send(
    new UpdateCommand({
      TableName: TableName(),
      Key: claimKeys(practiceId, dateOfService, claimId),
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
      UpdateExpression: `SET ${setParts.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}
