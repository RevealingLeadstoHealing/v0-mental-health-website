import { NextResponse } from "next/server";
import { callCognito, getCognitoClientId } from "../../../../../../lib/ehr/cognito-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const confirmationCode = typeof body.confirmationCode === "string" ? body.confirmationCode.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!email || !confirmationCode || !newPassword) {
      return NextResponse.json({ error: "Email, recovery code, and new password are required." }, { status: 400 });
    }
    await callCognito("ConfirmForgotPassword", {
      ClientId: getCognitoClientId(),
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    });
    return NextResponse.json({ confirmed: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Password reset failed." }, { status: 400 });
  }
}
