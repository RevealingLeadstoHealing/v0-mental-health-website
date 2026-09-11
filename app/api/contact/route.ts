import { NextResponse, type NextRequest } from "next/server";
import { sendContactFormEmail } from "../../../lib/site/send-contact-email";

// Handles the public Contact page form (a plain HTML POST, no JavaScript
// required). Redirects back to /contact with a status flag the page reads
// to show a thank-you or error notice.

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;

  let name = "";
  let email = "";
  let phone = "";
  let message = "";
  let wantsCopy = false;

  try {
    const form = await request.formData();
    name = String(form.get("name") || "").trim();
    email = String(form.get("email") || "").trim();
    phone = String(form.get("phone") || "").trim();
    message = String(form.get("message") || "").trim();
    wantsCopy = form.get("copy") === "1";
  } catch {
    return NextResponse.redirect(new URL("/contact?error=1", origin), { status: 303 });
  }

  if (!name || !email || !message || !phone) {
    return NextResponse.redirect(new URL("/contact?error=1", origin), { status: 303 });
  }

  const result = await sendContactFormEmail({ name, email, phone, message, wantsCopy });

  if (result === "sent") {
    return NextResponse.redirect(new URL("/contact?sent=1", origin), { status: 303 });
  }

  // "not-configured" (no AWS runtime credentials, e.g. local dev) or
  // "email-pending-ses" / "email-error" (SES not yet out of sandbox, etc.)
  return NextResponse.redirect(new URL("/contact?error=1", origin), { status: 303 });
}
