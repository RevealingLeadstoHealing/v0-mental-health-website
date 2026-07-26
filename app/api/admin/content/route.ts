import { NextResponse } from "next/server";
import { getSiteContent, saveSiteContent } from "../../../../lib/ehr/content-store";
import { requireEhrActor, requireRole, apiErrorResponse } from "../../../../lib/ehr/auth";
import { defaultSiteContent, type SiteContent } from "../../../../lib/site-content";

export async function GET() {
  try {
    const content = await getSiteContent();
    return NextResponse.json(content);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ["owner"]);

    const body = await request.json();

    // Merge with defaults to fill in any missing keys
    const content: SiteContent = { ...defaultSiteContent, ...body };

    await saveSiteContent(content);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
