import { NextResponse } from "next/server";
import {
  authResponseFromCognito,
  callCognito,
  getCognitoClientId,
  readEhrRefreshCookie,
} from "../../../../../lib/ehr/cognito-client";

export async function POST(request: Request) {
  const refreshToken = readEhrRefreshCookie(request.headers.get("cookie") || "");
  if (!refreshToken) {
    return NextResponse.json({ error: "Your secure EHR session has ended. Please sign in again." }, { status: 401 });
  }

  try {
    const data = await callCognito("InitiateAuth", {
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: getCognitoClientId(),
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    });
    return authResponseFromCognito(data);
  } catch {
    return NextResponse.json({ error: "Your secure EHR session has ended. Please sign in again." }, { status: 401 });
  }
}
