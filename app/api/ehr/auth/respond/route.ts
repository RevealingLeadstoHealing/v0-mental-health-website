import { NextResponse } from "next/server";
import { authResponseFromCognito, callCognito, getCognitoClientId } from "../../../../../lib/ehr/cognito-client";

const supportedChallenges = new Set(["NEW_PASSWORD_REQUIRED", "SOFTWARE_TOKEN_MFA", "MFA_SETUP"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const challengeName = typeof body.challengeName === "string" ? body.challengeName : "";
    const session = typeof body.session === "string" ? body.session : "";
    const username = typeof body.username === "string" ? body.username : "";

    if (!supportedChallenges.has(challengeName) || !session || !username) {
      return NextResponse.json({ error: "Valid challenge, session, and username are required." }, { status: 400 });
    }

    const challengeResponses: Record<string, string> = { USERNAME: username };
    if (challengeName === "NEW_PASSWORD_REQUIRED") {
      if (typeof body.newPassword !== "string" || !body.newPassword) {
        return NextResponse.json({ error: "A new password is required." }, { status: 400 });
      }
      challengeResponses.NEW_PASSWORD = body.newPassword;
    }
    if (challengeName === "SOFTWARE_TOKEN_MFA") {
      if (typeof body.mfaCode !== "string" || !/^\d{6}$/.test(body.mfaCode.trim())) {
        return NextResponse.json({ error: "A valid 6-digit authenticator code is required." }, { status: 400 });
      }
      challengeResponses.SOFTWARE_TOKEN_MFA_CODE = body.mfaCode.trim();
    }

    const data = await callCognito("RespondToAuthChallenge", {
      ClientId: getCognitoClientId(),
      ChallengeName: challengeName,
      Session: session,
      ChallengeResponses: challengeResponses,
    });

    return authResponseFromCognito(data, username);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication challenge failed." },
      { status: 401 }
    );
  }
}
