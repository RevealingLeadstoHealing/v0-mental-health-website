import type { ClientId, PracticeId, RecordId, UserId, UserRole } from "./domain-model";

export type AuditAction =
  | "auth.login.success"
  | "auth.login.failed"
  | "auth.logout"
  | "client.created"
  | "chart.viewed"
  | "note.created"
  | "note.updated"
  | "note.signed"
  | "note.amended"
  | "consent.sent"
  | "consent.signed"
  | "document.uploaded"
  | "document.viewed"
  | "billing.created"
  | "billing.submitted"
  | "record.requested"
  | "record.exported"
  | "admin.role_changed"
  | "security.access_denied";

export interface AuditActor {
  userId: UserId;
  role: UserRole;
  displayName: string;
}

export interface AuditEvent {
  eventId: string;
  practiceId: PracticeId;
  actor: AuditActor;
  action: AuditAction;
  occurredAt: string;
  clientId?: ClientId;
  recordId?: RecordId;
  targetType?: "practice" | "user" | "client" | "note" | "consent" | "document" | "billing" | "system";
  result: "success" | "failure";
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export const AUDIT_POLICY = {
  appendOnly: true,
  userEditable: false,
  requiredForClinicalAccess: true,
  requiredForSignature: true,
  requiredForExport: true,
  minimumRetentionYears: 6,
  phiInRuntimeLogsAllowed: false,
} as const;

export function buildAuditEvent(input: Omit<AuditEvent, "eventId" | "occurredAt">): AuditEvent {
  return {
    ...input,
    eventId: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    occurredAt: new Date().toISOString(),
  };
}