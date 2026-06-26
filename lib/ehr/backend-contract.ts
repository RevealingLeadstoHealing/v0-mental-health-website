import type {
  BillingRecord,
  ClientId,
  ClientProfile,
  ClinicalNote,
  ConsentRecord,
  DocumentMetadata,
  PracticeId,
  PracticeUser,
  RecordId,
  UserId,
} from "./domain-model";
import type { AuditEvent } from "./audit-model";

export type EhrBackendMode = "demo-local" | "aws-production";

export interface EhrSessionClaims {
  userId: UserId;
  practiceId: PracticeId;
  role: PracticeUser["role"];
  assignedClientIds?: ClientId[];
  mfaVerified: boolean;
  expiresAt: string;
}

export interface EhrBackendStatus {
  mode: EhrBackendMode;
  clinicalUseAllowed: boolean;
  baaSigned: boolean;
  authConfigured: boolean;
  databaseConfigured: boolean;
  privateDocumentStorageConfigured: boolean;
  auditLoggingConfigured: boolean;
  backupsConfigured: boolean;
}

export interface EhrRepository {
  getBackendStatus(): Promise<EhrBackendStatus>;
  getCurrentSession(): Promise<EhrSessionClaims | null>;
  listClients(practiceId: PracticeId): Promise<ClientProfile[]>;
  getClient(clientId: ClientId): Promise<ClientProfile | null>;
  saveClient(client: ClientProfile): Promise<ClientProfile>;
  listClinicalNotes(clientId: ClientId): Promise<ClinicalNote[]>;
  saveClinicalNote(note: ClinicalNote): Promise<ClinicalNote>;
  signClinicalNote(recordId: RecordId, signerId: UserId): Promise<ClinicalNote>;
  listConsents(clientId: ClientId): Promise<ConsentRecord[]>;
  saveConsent(consent: ConsentRecord): Promise<ConsentRecord>;
  listDocuments(clientId: ClientId): Promise<DocumentMetadata[]>;
  listBillingRecords(clientId: ClientId): Promise<BillingRecord[]>;
  saveBillingRecord(record: BillingRecord): Promise<BillingRecord>;
  appendAuditEvent(event: AuditEvent): Promise<void>;
}

export const PRODUCTION_BACKEND_GATES = {
  clinicalUseRequiresBaa: true,
  clinicalUseRequiresMfa: true,
  clinicalUseRequiresServerStorage: true,
  clinicalUseRequiresPrivateDocuments: true,
  clinicalUseRequiresAppendOnlyAudit: true,
  clinicalUseRequiresBackups: true,
  demoLocalStorageAllowsPhi: false,
} as const;

export function assertProductionBackendReady(status: EhrBackendStatus): void {
  const missing = [
    ["BAA", status.baaSigned],
    ["auth", status.authConfigured],
    ["database", status.databaseConfigured],
    ["private document storage", status.privateDocumentStorageConfigured],
    ["audit logging", status.auditLoggingConfigured],
    ["backups", status.backupsConfigured],
  ]
    .filter(([, ready]) => !ready)
    .map(([label]) => label);

  if (status.mode !== "aws-production" || !status.clinicalUseAllowed || missing.length > 0) {
    throw new Error(`RLTH EHR production backend is not ready for PHI. Missing: ${missing.join(", ") || "production approval"}.`);
  }
}