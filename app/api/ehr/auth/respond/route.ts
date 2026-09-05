import { NextResponse } from "next/server";
import {
  authResponseFromCognito,
  callCognito,
  getCognitoClientId,
} from "../../../../../lib/ehr/cognito-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const challengeName = typeof body.challengeName === "string" ? body.challengeName.trim() : "";
    const session = typeof body.session === "string" ? body.session.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";

    if (!challengeName || !session || !username) {
      return NextResponse.json(
        { error: "challengeName, session, and username are required." },
        { status: 400 }
      );
    }

    const challengeResponses: Record<string, string> = { USERNAME: username };

    if (challengeName === "NEW_PASSWORD_REQUIRED") {
      const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
      if (!newPassword) {
        return NextResponse.json(
          { error: "newPassword is required for NEW_PASSWORD_REQUIRED challenge." },
          { status: 400 }
        );
      }
      challengeResponses.NEW_PASSWORD = newPassword;
    } else if (challengeName === "SOFTWARE_TOKEN_MFA") {
      const mfaCode = typeof body.mfaCode === "string" ? body.mfaCode.trim() : "";
      if (!mfaCode) {
        return NextResponse.json(
          { error: "mfaCode is required for SOFTWARE_TOKEN_MFA challenge." },
          { status: 400 }
        );
      }
      challengeResponses.SOFTWARE_TOKEN_MFA_CODE = mfaCode;
    } else if (challengeName === "MFA_SETUP") {
      // After VerifySoftwareToken succeeds, the returned session is exchanged here.
      // Cognito processes the MFA_SETUP completion; no additional response key is needed.
    } else {
      return NextResponse.json(
        { error: `Unsupported auth challenge: ${challengeName}` },
        { status: 400 }
      );
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
      { error: error instanceof Error ? error.message : "Auth challenge response failed." },
      { status: 401 }
    );
  }
}
