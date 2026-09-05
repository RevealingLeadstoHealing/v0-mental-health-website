import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor } from "../../../../../lib/ehr/auth";

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
    // A 401 ApiError means no valid session — return unauthenticated rather
    // than a 401 HTTP response so the client can handle it gracefully.
    if (error instanceof ApiError && error.status === 401) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }
    return apiErrorResponse(error);
  }
}
