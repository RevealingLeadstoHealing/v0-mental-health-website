import { getRlthAwsFoundationStatus } from "../rlth-aws-foundation";
import type { EhrBackendStatus } from "./backend-contract";

/**
 * Real backend-readiness status, replacing the previously-undocumented gap
 * where EHR_PHI_ENTRY_ALLOWED was referenced in docs and passed through the
 * Amplify build but never actually read by any code path.
 *
 * EHR_PHI_ENTRY_ALLOWED is the owner's single attestation switch: set it to
 * the exact string "true" in Amplify Console (App settings > Environment
 * variables) once the BAA is signed, backups are confirmed, and operating
 * policy is in place. Until it is set to "true", clinical writes are
 * blocked with a clear error instead of silently succeeding.
 */
export function getBackendStatus(): EhrBackendStatus {
  const foundation = getRlthAwsFoundationStatus();
  const ownerAttested = process.env.EHR_PHI_ENTRY_ALLOWED === "true";

  return {
    mode: "aws-production",
    clinicalUseAllowed: ownerAttested,
    baaSigned: ownerAttested,
    authConfigured: foundation.cognitoConfigured,
    databaseConfigured: foundation.storageConfigured,
    privateDocumentStorageConfigured: foundation.storageConfigured,
    auditLoggingConfigured: foundation.auditConfigured,
    backupsConfigured: ownerAttested,
  };
}
