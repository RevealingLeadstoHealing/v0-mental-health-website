import { NextResponse } from "next/server";
import { callCognito } from "../../../../../../lib/ehr/cognito-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = typeof body.session === "string" ? body.session : "";

    if (!session) {
      return NextResponse.json({ error: "Cognito session is required." }, { status: 400 });
    }

    const data = await callCognito("AssociateSoftwareToken", { Session: session });

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
