import { NextResponse } from "next/server";
import { apiErrorResponse, requireEhrActor } from "../../../../../lib/ehr/auth";

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    return NextResponse.json({
      authenticated: true,
      user: {
        id: actor.sub,
        email: actor.email,
        fullName: actor.name,
        role: actor.role,
        practiceId: actor.practiceId,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing Cognito")) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }
    return apiErrorResponse(error);
  }
}
