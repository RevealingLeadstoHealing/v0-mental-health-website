import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { NextResponse } from "next/server";
import { getAwsRegion } from "./aws-runtime";
import { readEhrIdCookie } from "./cognito-client";
import { rlthAwsFoundation } from "../rlth-aws-foundation";

export type EhrRole = "owner" | "provider" | "clinical_staff" | "billing_staff" | "client" | "auditor";

export type EhrActor = {
  sub: string;
  email: string;
  name: string;
  role: EhrRole;
  groups: string[];
  practiceId: string;
  tokenUse?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Built on first request rather than at module scope: Next.js evaluates route modules
// during `next build`, so a malformed region or pool id used to throw ERR_INVALID_URL
// and fail the whole build. Now it surfaces as a 500 on the affected route instead.
let cachedIssuer = "";
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getIssuer() {
  const region = getAwsRegion();
  const userPoolId = rlthAwsFoundation.cognitoUserPoolId.trim();

  if (!userPoolId) {
    throw new ApiError(500, "The EHR Cognito user pool is not configured.");
  }

  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

function getJwksConfig() {
  const issuer = getIssuer();

  if (!cachedJwks || cachedIssuer !== issuer) {
    try {
      cachedJwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    } catch {
      throw new ApiError(500, "The EHR Cognito issuer is misconfigured.");
    }
    cachedIssuer = issuer;
  }

  return { issuer, jwks: cachedJwks };
}

function getStringClaim(payload: JWTPayload, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function normalizeRole(payload: JWTPayload, groups: string[]): EhrRole {
  const customRole = getStringClaim(payload, "custom:role");
  const role = customRole || groups[0] || "client";
  if (["owner", "provider", "clinical_staff", "billing_staff", "client", "auditor"].includes(role)) {
    return role as EhrRole;
  }
  return "client";
}

function getRequestToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (bearerToken) return bearerToken;

  const cookieHeader = request.headers.get("cookie") || "";
  return readEhrIdCookie(cookieHeader);
}

export async function requireEhrActor(request: Request): Promise<EhrActor> {
  const token = getRequestToken(request);

  if (!token) {
    throw new ApiError(401, "Missing Cognito bearer token or EHR session cookie.");
  }

  const { issuer, jwks } = getJwksConfig();
  const { payload } = await jwtVerify(token, jwks, { issuer });
  const audience = typeof payload.aud === "string" ? payload.aud : getStringClaim(payload, "client_id");

  if (audience !== rlthAwsFoundation.cognitoUserPoolClientId) {
    throw new ApiError(401, "Token was not issued for this EHR application.");
  }

  const groupsClaim = payload["cognito:groups"];
  const groups = Array.isArray(groupsClaim) ? groupsClaim.filter((item): item is string => typeof item === "string") : [];
  const sub = payload.sub || "";

  if (!sub) {
    throw new ApiError(401, "Token is missing a subject.");
  }

  return {
    sub,
    email: getStringClaim(payload, "email"),
    name: getStringClaim(payload, "name") || getStringClaim(payload, "cognito:username") || sub,
    role: normalizeRole(payload, groups),
    groups,
    practiceId: getStringClaim(payload, "custom:practiceId") || "rlth",
    tokenUse: getStringClaim(payload, "token_use"),
  };
}

export function requireRole(actor: EhrActor, allowedRoles: EhrRole[]) {
  if (!allowedRoles.includes(actor.role)) {
    throw new ApiError(403, "Your account does not have access to this EHR action.");
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "The EHR request could not be completed." }, { status: 500 });
}
