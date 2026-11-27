import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, requireEhrActor } from "../../../../../lib/ehr/auth";
import { getSupervisee } from "../../../../../lib/ehr/supervision-store";
import type { SuperviseeEntry } from "../../../../../lib/ehr/supervision";

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    // Supervisee registry entry (null for the owner and everyone not flagged). A lookup
    // failure never breaks sign-in; the UI fails closed for non-owners instead.
    let supervision: SuperviseeEntry | null = null;
    let supervisionLookupFailed = false;
    if (actor.role !== "client" && actor.role !== "owner") {
      try {
        supervision = await getSupervisee(actor.practiceId, actor.email);
      } catch {
        supervisionLookupFailed = true;
      }
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        id: actor.sub,
        email: actor.email,
        fullName: actor.name,
        role: actor.role,
        practiceId: actor.practiceId,
        supervision,
        supervisionLookupFailed,
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
