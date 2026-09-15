// Minimal Spruce API client. Spruce authenticates with a Bearer token — the
// "Live Secret" generated in Spruce under Settings -> Integrations & API
// (not the Access ID, which starts with "aid_"). That token is read from
// SPRUCE_API_TOKEN at request time; this file never hardcodes it.
//
// This client is a fallback only. Per Spruce's own guidance, the webhook
// event payload already carries the signedUrl needed to fetch a fax PDF or
// call recording directly (and using that URL does not count against the
// API rate limit), so most of the time no API call is needed at all. This
// exists for the rare case where a webhook event arrives without a usable
// signedUrl and we need to re-fetch the conversationItem to find one.

const SPRUCE_API_BASE = "https://api.sprucehealth.com/v1";

function requireApiToken() {
  const token = process.env.SPRUCE_API_TOKEN || "";
  if (!token) throw new Error("SPRUCE_API_TOKEN is not configured.");
  return token;
}

export async function fetchSpruceConversationItem(conversationItemId: string) {
  const token = requireApiToken();
  const response = await fetch(`${SPRUCE_API_BASE}/conversationItems/${encodeURIComponent(conversationItemId)}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Spruce API returned ${response.status} fetching conversationItem ${conversationItemId}.`);
  }
  return response.json();
}
