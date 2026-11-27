// Decides whether a Spruce conversationItem is a message our side produced
// (for example a fax sent through the EHR) so the webhook does not store it
// as an inbound fax. Spruce's exact outbound field name has not been confirmed
// against a captured payload, so this checks several independent signals and
// the webhook also treats an unconfirmed direction conservatively.

export type OutboundCheckItem = {
  direction?: string;
  outbound?: boolean;
  internal?: boolean;
  author?: { phoneNumber?: string; type?: string; entityId?: string };
  source?: { value?: string; type?: string };
};

const OUTBOUND_DIRECTIONS = new Set(["outbound", "out", "outgoing", "internal"]);
const INTERNAL_AUTHOR_TYPES = new Set(["teammember", "team_member", "team-member", "user", "api", "system", "internal", "internalendpoint"]);

function digits(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

export function isOutboundSpruceItem(item: OutboundCheckItem, practiceFaxE164: string): boolean {
  const direction = String(item.direction || "").trim().toLowerCase();
  if (OUTBOUND_DIRECTIONS.has(direction)) return true;
  if (item.outbound === true || item.internal === true) return true;

  // A fax that appears to come FROM the practice fax line is our own send.
  const practice = digits(practiceFaxE164);
  if (practice) {
    const from = [digits(item.author?.phoneNumber), digits(item.source?.value)];
    if (from.some((value) => value && value.slice(-10) === practice.slice(-10))) return true;
  }

  // Authored by a staff member, the API, or an internal endpoint rather than an outside sender.
  const authorType = String(item.author?.type || "").trim().toLowerCase();
  if (authorType && INTERNAL_AUTHOR_TYPES.has(authorType)) return true;
  const sourceType = String(item.source?.type || "").trim().toLowerCase();
  if (sourceType && INTERNAL_AUTHOR_TYPES.has(sourceType)) return true;
  return false;
}
