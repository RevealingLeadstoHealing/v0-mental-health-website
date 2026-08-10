import { NextResponse } from "next/server";
import { callCognito, readEhrAccessCookie } from "../../../../../../lib/ehr/cognito-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = typeof body.session === "string" ? body.session : "";
    const accessToken = readEhrAccessCookie(request.headers.get("cookie") || "");

    if (!session && !accessToken) {
      return NextResponse.json({ error: "An authenticated EHR session or Cognito setup session is required." }, { status: 401 });
    }

    const data = await callCognito("AssociateSoftwareToken", session ? { Session: session } : { AccessToken: accessToken });

    return NextResponse.json({
      secretCode: data.SecretCode || "",
      session: data.Session || "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "MFA setup failed." },
      { status: 401 }
    );
  }
}
