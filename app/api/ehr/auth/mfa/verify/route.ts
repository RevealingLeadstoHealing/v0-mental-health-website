import { NextResponse } from "next/server";
import { callCognito } from "../../../../../../lib/ehr/cognito-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = typeof body.session === "string" ? body.session : "";
    const userCode = typeof body.userCode === "string" ? body.userCode.trim() : "";
    const friendlyDeviceName = typeof body.friendlyDeviceName === "string" ? body.friendlyDeviceName : "RLTH EHR Authenticator";

    if (!session || !userCode) {
      return NextResponse.json({ error: "Cognito session and authenticator code are required." }, { status: 400 });
    }

    const data = await callCognito("VerifySoftwareToken", {
      Session: session,
      UserCode: userCode,
      FriendlyDeviceName: friendlyDeviceName,
    });

    return NextResponse.json({
      status: data.Status || "",
      session: data.Session || "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "MFA verification failed." },
      { status: 401 }
    );
  }
}
