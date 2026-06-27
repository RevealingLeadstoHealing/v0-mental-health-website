import { NextResponse } from "next/server";
import { authResponseFromCognito, callCognito, getCognitoClientId } from "../../../../../lib/ehr/cognito-client";

const allowedChallenges = new Set(["NEW_PASSWORD_REQUIRED", "SOFTWARE_TOKEN_MFA", "MFA_SETUP"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const challengeName = typeof body.challengeName === "string" ? body.challengeName : "";
    const session = typeof body.session === "string" ? body.session : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";

    if (!allowedChallenges.has(challengeName) || !session || !username) {
      return NextResponse.json({ error: "A valid Cognito challenge, session, and username are required." }, { status: 400 });
    }

    const ChallengeResponses: Record<string, string> = { USERNAME: username };

    if (challengeName === "NEW_PASSWORD_REQUIRED") {
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      if (!newPassword) return NextResponse.json({ error: "New password is required." }, { status: 400 });
      ChallengeResponses.NEW_PASSWORD = newPassword;
    }

    if (challengeName === "SOFTWARE_TOKEN_MFA") {
      const mfaCode = typeof body.mfaCode === "string" ? body.mfaCode.trim() : "";
      if (!mfaCode) return NextResponse.json({ error: "Authenticator code is required." }, { status: 400 });
      ChallengeResponses.SOFTWARE_TOKEN_MFA_CODE = mfaCode;
    }

    const data = await callCognito("RespondToAuthChallenge", {
      ClientId: getCognitoClientId(),
      ChallengeName: challengeName,
      Session: session,
      ChallengeResponses,
    });

    return authResponseFromCognito(data, username);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cognito challenge response failed." },
      { status: 401 }
    );
  }
}
