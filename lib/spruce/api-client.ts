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

// --- Outbound fax -----------------------------------------------------------
// Used only by app/api/ehr/spruce-fax when SPRUCE_FAX_SEND_MODE=live. Errors
// carry the HTTP status only; response bodies and the token are never logged.

export const PRACTICE_FAX_E164 = "+19143713845";

type SpruceEndpointEntry = {
  id?: string;
  channel?: string;
  rawValue?: string;
  value?: string;
  endpoint?: { id?: string; channel?: string; rawValue?: string; value?: string };
};

/** Finds the practice's Spruce fax line. SPRUCE_FAX_ENDPOINT_ID overrides the lookup. */
export async function resolveSpruceFaxEndpointId(): Promise<string> {
  const override = (process.env.SPRUCE_FAX_ENDPOINT_ID || "").trim();
  if (override) return override;
  const token = requireApiToken();
  const response = await fetch(`${SPRUCE_API_BASE}/internalendpoints`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Spruce API returned ${response.status} listing internal endpoints.`);
  const body = (await response.json()) as { internalEndpoints?: SpruceEndpointEntry[] };
  const wanted = PRACTICE_FAX_E164.replace(/\D/g, "");
  for (const entry of body.internalEndpoints || []) {
    const endpoint = entry.endpoint || entry;
    const channel = String(endpoint.channel || entry.channel || "").toLowerCase();
    const value = String(endpoint.rawValue || entry.rawValue || endpoint.value || entry.value || "").replace(/\D/g, "");
    const id = endpoint.id || entry.id || "";
    if (channel === "fax" && id && value.endsWith(wanted.slice(-10))) return id;
  }
  throw new Error("The practice fax line was not found among Spruce internal endpoints.");
}

export async function uploadSpruceMedia(bytes: Uint8Array, fileName: string, mimeType = "application/pdf"): Promise<string> {
  const token = requireApiToken();
  const form = new FormData();
  form.append("media", new Blob([bytes as BlobPart], { type: mimeType }), fileName);
  const response = await fetch(`${SPRUCE_API_BASE}/media`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Spruce API returned ${response.status} uploading media.`);
  const body = (await response.json()) as { id?: string; media?: { id?: string } };
  const id = body.id || body.media?.id || "";
  if (!id) throw new Error("Spruce did not return a media id.");
  return id;
}

export async function sendSpruceFax(params: {
  internalEndpointId: string;
  destinationE164: string;
  messageText: string;
  attachmentId: string;
  attachmentTitle: string;
  idempotencyKey: string;
}): Promise<{ requestId: string }> {
  const token = requireApiToken();
  const response = await fetch(`${SPRUCE_API_BASE}/internalendpoints/${encodeURIComponent(params.internalEndpointId)}/conversations`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "s-idempotency-key": params.idempotencyKey,
    },
    body: JSON.stringify({
      destination: { faxEndpoint: params.destinationE164 },
      message: {
        body: [{ type: "text", value: params.messageText }],
        attachments: [{ attachmentId: params.attachmentId, title: params.attachmentTitle }],
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Spruce API returned ${response.status} sending the fax.`);
  const body = (await response.json()) as { requestId?: string };
  return { requestId: body.requestId || "" };
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
