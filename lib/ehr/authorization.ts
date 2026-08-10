import { ApiError, type EhrActor } from "./auth";
import { getClientProfile } from "./dynamodb-store";

export async function requireClientAccess(actor: EhrActor, clientId: string) {
  const client = await getClientProfile(actor.practiceId, clientId);
  if (!client) throw new ApiError(404, "Client chart was not found.");
  if (actor.role === "owner" || actor.role === "auditor") return client;
  if (actor.role === "client" && client.cognitoUserId === actor.sub) return;
  if (["provider", "clinical_staff", "billing_staff"].includes(actor.role)) {
    const assignments = Array.isArray(client.assignedProviderIds) ? client.assignedProviderIds : [];
    if (assignments.includes(actor.sub)) return;
  }
  throw new ApiError(403, "You are not assigned to this client chart.");
}
