export type PracticeId = string;
export type UserId = string;
export type ClientId = string;
export type RecordId = string;

export type PracticeMode = "single-practice" | "multi-practice-saas";
export type UserRole = "owner" | "provider" | "clinical_staff" | "billing_staff" | "client" | "auditor";
export type RecordStatus = "draft" | "pending_signature" | "signed" | "amended" | "voided";
export type AccessLevel = "provider_only" | "client_portal" | "formal_records_request" | "restricted_psychotherapy_note";

export interface PracticeTenant {
  practiceId: PracticeId;
  legalName: string;
  displayName: string;
  mode: PracticeMode;
  npi?: string;
  taxIdLast4?: string;
  baaEffectiveDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeUser {
  userId: UserId;
  practiceId: PracticeId;
  role: UserRole;
  email: string;
  fullName: string;
  credentials?: string;
  mfaRequired: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientProfile {
  clientId: ClientId;
  practiceId: PracticeId;
  assignedProviderIds: UserId[];
  fullName: string;
  dateOfBirth?: string;
  preferredName?: string;
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosisCode {
  system: "ICD-10-CM" | "DSM-5-TR";
  code: string;
  label: string;
  rank: "primary" | "secondary" | "tertiary";
}

export interface ServiceCode {
  system: "CPT" | "HCPCS" | "custom";
  code: string;
  label: string;
  units?: number;
  minutes?: number;
}

export interface ClinicalNote {
  recordId: RecordId;
  practiceId: PracticeId;
  clientId: ClientId;
  providerId: UserId;
  noteType: "biopsychosocial" | "initial_progress" | "progress" | "treatment_plan" | "psychotherapy_note" | "crisis";
  accessLevel: AccessLevel;
  status: RecordStatus;
  serviceDate: string;
  sessionStart?: string;
  sessionEnd?: string;
  sessionMinutes?: number;
  chiefComplaint?: string;
  diagnoses: DiagnosisCode[];
  serviceCodes: ServiceCode[];
  content: Record<string, unknown>;
  providerSignature?: ElectronicSignature;
  clientSignature?: ElectronicSignature;
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
}

export interface ConsentRecord {
  recordId: RecordId;
  practiceId: PracticeId;
  clientId: ClientId;
  consentType: "treatment" | "telehealth" | "privacy_practices" | "release_of_information" | "financial" | "communication";
  status: "pending" | "signed" | "revoked" | "expired";
  version: string;
  signedAt?: string;
  revokedAt?: string;
  signature?: ElectronicSignature;
}

export interface ElectronicSignature {
  signerUserId?: UserId;
  signerName: string;
  signerRole: UserRole | "guardian" | "external_party";
  signedAt: string;
  attestation: string;
  ipAddressHash?: string;
  documentVersion?: string;
}

export interface DocumentMetadata {
  documentId: RecordId;
  practiceId: PracticeId;
  clientId: ClientId;
  uploadedBy: UserId;
  title: string;
  documentType: "consent" | "assessment" | "insurance" | "clinical" | "billing" | "other";
  storageKey: string;
  accessLevel: AccessLevel;
  createdAt: string;
}

export interface BillingRecord {
  billingId: RecordId;
  practiceId: PracticeId;
  clientId: ClientId;
  providerId: UserId;
  serviceDate: string;
  diagnoses: DiagnosisCode[];
  serviceCodes: ServiceCode[];
  status: "draft" | "ready" | "submitted" | "paid" | "denied" | "voided";
  createdAt: string;
  updatedAt: string;
}

export const RLTH_PRACTICE_FIRST_MODEL = {
  practiceIdRequiredOnEveryRecord: true,
  futureLeasingReady: true,
  localStorageAllowedForPhi: false,
  publicSelfRegistrationAllowed: false,
  providerMfaRequired: true,
  psychotherapyNotesSeparated: true,
  auditLogAppendOnly: true,
} as const;