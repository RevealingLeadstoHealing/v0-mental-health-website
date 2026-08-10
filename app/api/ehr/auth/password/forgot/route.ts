import { NextResponse } from "next/server";
import { callCognito, getCognitoClientId } from "../../../../../../lib/ehr/cognito-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
    const data = await callCognito("ForgotPassword", { ClientId: getCognitoClientId(), Username: email });
    return NextResponse.json({
      sent: true,
      destination: data.CodeDeliveryDetails?.Destination || "",
      deliveryMedium: data.CodeDeliveryDetails?.DeliveryMedium || "EMAIL",
    });
  } catch {
    // Avoid disclosing whether an account exists.
    return NextResponse.json({ sent: true, destination: "", deliveryMedium: "EMAIL" });
  }
}
