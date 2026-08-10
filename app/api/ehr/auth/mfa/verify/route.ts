import { NextResponse } from "next/server";
import { callCognito, readEhrAccessCookie } from "../../../../../../lib/ehr/cognito-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = typeof body.session === "string" ? body.session : "";
    const accessToken = readEhrAccessCookie(request.headers.get("cookie") || "");
    const userCode = typeof body.userCode === "string" ? body.userCode.trim() : "";
    const friendlyDeviceName = typeof body.friendlyDeviceName === "string" ? body.friendlyDeviceName : "RLTH EHR Authenticator";

    if ((!session && !accessToken) || !userCode) {
      return NextResponse.json({ error: "An authenticated EHR session and authenticator code are required." }, { status: 400 });
    }

    const data = await callCognito("VerifySoftwareToken", {
      ...(session ? { Session: session } : { AccessToken: accessToken }),
      UserCode: userCode,
      FriendlyDeviceName: friendlyDeviceName,
    });

    if (accessToken && data.Status === "SUCCESS") {
      await callCognito("SetUserMFAPreference", {
        AccessToken: accessToken,
        SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
      });
    }

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
