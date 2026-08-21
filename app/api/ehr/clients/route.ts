import { createHash, createHmac, randomInt } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor, requireRole } from "../../../../lib/ehr/auth";
import { getAwsRegion, getDynamoDocumentClient } from "../../../../lib/ehr/aws-runtime";
import { appendAuditEvent, listClientProfiles, putClientProfile } from "../../../../lib/ehr/dynamodb-store";
import { rlthAwsFoundation } from "../../../../lib/rlth-aws-foundation";

type CognitoAdminResult = {
  User?: { Username?: string; Attributes?: Array<{ Name?: string; Value?: string }> };
  __type?: string;
  message?: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function signingKey(secret: string, date: string, region: string) {
  const dateKey = createHmac("sha256", `AWS4${secret}`).update(date).digest();
  const regionKey = createHmac("sha256", dateKey).update(region).digest();
  const serviceKey = createHmac("sha256", regionKey).update("cognito-idp").digest();
  return createHmac("sha256", serviceKey).update("aws4_request").digest();
}

function temporaryPatientPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_";
  const groups = [upper, lower, digits, symbols];
  const alphabet = groups.join("");
  const characters = groups.map((group) => group[randomInt(group.length)]);
  while (characters.length < 14) characters.push(alphabet[randomInt(alphabet.length)]);
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    [characters[index], characters[other]] = [characters[other], characters[index]];
  }
  return characters.join("");
}

async function cognitoAdmin(action: "AdminCreateUser" | "AdminAddUserToGroup", payload: Record<string, unknown>) {
  const region = getAwsRegion();
  if (!region) throw new ApiError(500, "AWS authentication region is not configured.");
  const credentials = await new DynamoDBClient({ region }).config.credentials();
  const host = `cognito-idp.${region}.amazonaws.com`;
  const body = JSON.stringify(payload);
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = timestamp.slice(0, 8);
  const headers: Record<string, string> = {
    "content-type": "application/x-amz-json-1.1",
    host,
    "x-amz-date": timestamp,
    "x-amz-target": `AWSCognitoIdentityProviderService.${action}`,
  };
  if (credentials.sessionToken) headers["x-amz-security-token"] = credentials.sessionToken;
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(";");
  const canonicalHeaders = names.map((name) => `${name}:${headers[name].trim()}\n`).join("");
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, sha256(body)].join("\n");
  const scope = `${date}/${region}/cognito-idp/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", timestamp, scope, sha256(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", signingKey(credentials.secretAccessKey, date, region))
    .update(stringToSign)
    .digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`https://${host}/`, {
    method: "POST",
    headers: { ...headers, authorization },
    body,
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as CognitoAdminResult;
  if (!response.ok) {
    const detail = result.message || result.__type || "Patient invitation could not be created.";
    if (detail.includes("already exists") || result.__type?.includes("UsernameExists")) {
      throw new ApiError(409, "A patient account already exists for this email address.");
    }
    if (detail.includes("not authorized") || result.__type?.includes("AccessDenied")) {
      throw new ApiError(403, "AWS has not granted the EHR permission to create patient login accounts.");
    }
    throw new ApiError(502, `Patient invitation failed: ${detail}`);
  }
  return result;
}

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider", "clinical_staff", "billing_staff", "client", "auditor"]);
    const clients = await listClientProfiles(actor);
    await appendAuditEvent(actor, {
      action: "Viewed authorized client list",
      category: "Client Access",
      entityType: "client-list",
      summary: `Returned ${clients.length} authorized client profiles.`,
    });
    return NextResponse.json({ clients });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner", "provider"]);
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!fullName) throw new ApiError(400, "Client full name is required.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Enter a valid patient email address to send the login invitation.");
    }

    let cognitoUserId = "";
    if (email) {
      const account = await cognitoAdmin("AdminCreateUser", {
        UserPoolId: rlthAwsFoundation.cognitoUserPoolId,
        Username: email,
        TemporaryPassword: temporaryPatientPassword(),
        DesiredDeliveryMediums: ["EMAIL"],
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: fullName },
          { Name: "custom:role", Value: "client" },
          { Name: "custom:practiceId", Value: actor.practiceId },
        ],
      });
      cognitoUserId = account.User?.Attributes?.find((attribute) => attribute.Name === "sub")?.Value || account.User?.Username || "";
      if (!cognitoUserId) throw new ApiError(502, "AWS created the patient account without a usable account identifier.");
      await cognitoAdmin("AdminAddUserToGroup", {
        UserPoolId: rlthAwsFoundation.cognitoUserPoolId,
        Username: email,
        GroupName: "client",
      });
    }

    const client = await putClientProfile(actor, {
      fullName,
      preferredName: typeof body.preferredName === "string" ? body.preferredName.trim() : "",
      dateOfBirth: typeof body.dateOfBirth === "string" ? body.dateOfBirth : "",
      email,
      phone: typeof body.phone === "string" ? body.phone.trim() : "",
      addressLine1: typeof body.addressLine1 === "string" ? body.addressLine1.trim() : "",
      addressLine2: typeof body.addressLine2 === "string" ? body.addressLine2.trim() : "",
      city: typeof body.city === "string" ? body.city.trim() : "",
      state: typeof body.state === "string" ? body.state.trim() : "",
      zipCode: typeof body.zipCode === "string" ? body.zipCode.trim() : "",
      assignedProviderIds: Array.isArray(body.assignedProviderIds)
        ? body.assignedProviderIds.filter((value: unknown): value is string => typeof value === "string")
        : [actor.sub],
    });

    if (cognitoUserId) {
      await getDynamoDocumentClient().send(new UpdateCommand({
        TableName: rlthAwsFoundation.clinicalRecordsTableName,
        Key: {
          PK: `PRACTICE#${actor.practiceId}#CLIENT#${client.clientId}`,
          SK: "PROFILE",
        },
        UpdateExpression: "SET cognitoUserId = :cognitoUserId, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":cognitoUserId": cognitoUserId,
          ":updatedAt": new Date().toISOString(),
        },
      }));
    }

    await appendAuditEvent(actor, {
      action: cognitoUserId ? "Created client chart and sent secure login invitation" : "Created client chart",
      category: "Client Administration",
      clientId: client.clientId,
      entityType: "client-profile",
      entityId: client.clientId,
      summary: cognitoUserId
        ? "A client chart and Cognito patient login were created; AWS delivered a temporary password."
        : "A client chart was created through the production API without a portal invitation.",
    });
    return NextResponse.json({
      client: { ...client, ...(cognitoUserId ? { cognitoUserId } : {}) },
      invitationSent: Boolean(cognitoUserId),
      loginUrl: cognitoUserId ? "/login" : null,
    }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
