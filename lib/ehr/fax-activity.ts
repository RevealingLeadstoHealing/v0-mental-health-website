export const faxActivityStatuses = ["Planned — not sent", "Provider reports sent — delivery unverified", "Provider reports failed", "Provider reports received"] as const;
export type FaxActivityInput = { id: string; recipient: string; description: string; status: string; occurredAt: string; evidence: string; noteId: string; authorizationConfirmed: boolean };
export function buildFaxActivity(input: FaxActivityInput, context: { clientId: string; appointmentId: string; actorId: string; actorName: string; recordedAt: string }) {
  if (!context.clientId || !context.appointmentId || !context.actorId || !input.id) throw new Error("Select the client and appointment first.");
  if (!input.authorizationConfirmed) throw new Error("Confirm the correct chart, recipient and disclosure authorization.");
  if (!faxActivityStatuses.includes(input.status as typeof faxActivityStatuses[number])) throw new Error("Select a supported fax activity status.");
  if (!input.recipient.trim() || !input.description.trim()) throw new Error("Document the recipient/source and the material involved.");
  if (!input.occurredAt || !Number.isFinite(Date.parse(input.occurredAt))) throw new Error("Enter the activity date and time.");
  if (input.status !== faxActivityStatuses[0] && !input.evidence.trim()) throw new Error("Document the source of the reported result, including any receipt reference.");
  const activity = { recipient: input.recipient.trim(), description: input.description.trim(), status: input.status, occurredAt: new Date(input.occurredAt).toISOString(), evidence: input.evidence.trim(), source: "provider-entered", deliveryVerified: false, billable: false };
  return { id: input.id, title: "Fax activity — session supporting documentation", type: "Clinical Document", category: "Fax Activity", status: "Recorded", clientVisible: false, createdAt: context.recordedAt, appointmentId: context.appointmentId, linkedNoteId: input.noteId, enteredBy: context.actorName, enteredById: context.actorId, faxActivity: activity, billable: false,
    generatedLetterText: [`Appointment: ${context.appointmentId}`, `Linked note: ${input.noteId || "No note selected"}`, `Activity: ${activity.status}`, `Recipient / source: ${activity.recipient}`, `Material / purpose: ${activity.description}`, `Activity time: ${activity.occurredAt}`, `Recorded at: ${context.recordedAt}`, `Recorded by: ${context.actorName}`, `Provider-entered evidence: ${activity.evidence || "None — planned only"}`, "Non-billable supporting documentation. This entry does not send a fax or independently confirm delivery."].join("\n") };
}
