import { decodeJwt } from "jose";
import { NextResponse } from "next/server";
import { getAwsRegion } from "./aws-runtime";
import { rlthAwsFoundation } from "../rlth-aws-foundation";

const COGNITO_TARGET_PREFIX = "AWSCognitoIdentityProviderService";
const ID_COOKIE = "rlth_ehr_id";
const ACCESS_COOKIE = "rlth_ehr_access";
const REFRESH_COOKIE = "rlth_ehr_refresh";

export type CognitoAction =
  | "InitiateAuth"
  | "RespondToAuthChallenge"
  | "AssociateSoftwareToken"
  | "VerifySoftwareToken";

export type CognitoAuthResult = {
  AccessToken?: string;
  ExpiresIn?: number;
  IdToken?: string;
  RefreshToken?: string;
  TokenType?: string;
};

export type CognitoResponse = {
  AuthenticationResult?: CognitoAuthResult;
  ChallengeName?: string;
  ChallengeParameters?: Record<string, string>;
  Session?: string;
  SecretCode?: string;
  Status?: string;
};

function cognitoEndpoint() {
  return `https://cognito-idp.${getAwsRegion()}.amazonaws.com/`;
}

export function getCognitoClientId() {
  return rlthAwsFoundation.cognitoUserPoolClientId;
}

export async function callCognito(action: CognitoAction, body: Record<string, unknown>) {
  const response = await fetch(cognitoEndpoint(), {
    method: "POST",
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amz-target": `${COGNITO_TARGET_PREFIX}.${action}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as CognitoResponse & {
    __type?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || data.__type || "Cognito authentication request failed.");
  }

  return data;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/ehr",
    maxAge,
  };
}

export function userFromIdToken(idToken = "") {
  if (!idToken) return null;
  const payload = decodeJwt(idToken);
  return {
    id: payload.sub || "",
    email: typeof payload.email === "string" ? payload.email : "",
    fullName: typeof payload.name === "string" ? payload.name : "EHR User",
    role: typeof payload["custom:role"] === "string" ? payload["custom:role"] : "client",
    practiceId: typeof payload["custom:practiceId"] === "string" ? payload["custom:practiceId"] : "rlth",
  };
}

export function authResponseFromCognito(data: CognitoResponse, username = "") {
  if (!data.AuthenticationResult) {
    return NextResponse.json({
      authenticated: false,
      challengeName: data.ChallengeName || "",
      session: data.Session || "",
      username: data.ChallengeParameters?.USER_ID_FOR_SRP || username,
      challengeParameters: {
        deliveryMedium: data.ChallengeParameters?.CODE_DELIVERY_DELIVERY_MEDIUM || "",
        destination: data.ChallengeParameters?.CODE_DELIVERY_DESTINATION || "",
      },
    });
  }

  const result = data.AuthenticationResult;
  const user = userFromIdToken(result.IdToken);
  const response = NextResponse.json({
    authenticated: true,
    user,
    expiresIn: result.ExpiresIn || 900,
  });

  if (result.IdToken) response.cookies.set(ID_COOKIE, result.IdToken, cookieOptions(result.ExpiresIn || 900));
  if (result.AccessToken) response.cookies.set(ACCESS_COOKIE, result.AccessToken, cookieOptions(result.ExpiresIn || 900));
  if (result.RefreshToken) response.cookies.set(REFRESH_COOKIE, result.RefreshToken, cookieOptions(8 * 60 * 60));

  return response;
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of [ID_COOKIE, ACCESS_COOKIE, REFRESH_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/ehr",
      maxAge: 0,
    });
  }
  return response;
}

export function readEhrIdCookie(cookieHeader: string) {
  const cookies = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator === -1) continue;
    const name = cookie.slice(0, separator);
    const value = cookie.slice(separator + 1);
    if (name === ID_COOKIE) return decodeURIComponent(value);
  }

  return "";
}
