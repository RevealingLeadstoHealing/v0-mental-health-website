import { NextResponse } from "next/server";
import { authResponseFromCognito, callCognito, getCognitoClientId } from "../../../../../lib/ehr/cognito-client";

export async function POST(request: Request) {
  const diagnosticId = crypto.randomUUID();
  const requestHost = request.headers.get("host") || "unknown";
  let submittedEmailLength = 0;
  let normalizedEmailLength = 0;
  let submittedPasswordLength = 0;

  try {
    const body = await request.json();
    const submittedEmail = typeof body.email === "string" ? body.email : "";
    const email = submittedEmail.trim().toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    submittedEmailLength = submittedEmail.length;
    normalizedEmailLength = email.length;
    submittedPasswordLength = password.length;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const data = await callCognito("InitiateAuth", {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: getCognitoClientId(),
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    return authResponseFromCognito(data, email);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "ehr-login-failure",
        diagnosticId,
        requestHost,
        submittedEmailLength,
        normalizedEmailLength,
        submittedPasswordLength,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : "Login failed.",
      })
    );

    return NextResponse.json(
      {
        error: `${error instanceof Error ? error.message : "Login failed."} Reference: ${diagnosticId}`,
        diagnosticId,
      },
      { status: 401 }
    );
  }
}
