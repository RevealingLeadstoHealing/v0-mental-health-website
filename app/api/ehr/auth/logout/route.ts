import { NextResponse } from "next/server";
import { clearAuthCookies } from "../../../../../lib/ehr/cognito-client";

export async function POST() {
  return clearAuthCookies(NextResponse.json({ loggedOut: true }));
}
