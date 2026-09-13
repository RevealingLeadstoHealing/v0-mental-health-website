// Provider identifiers supplied by the practice owner.
// Verification status is tracked per credential: "verified" means Claude or the practice
// independently confirmed it against the issuing body's own records; "self_reported" means
// it is provider-entered and has not (yet) been independently confirmed. Update the status
// and note whenever a credential is actually checked or renewed.
export type VerificationStatus = "verified" | "self_reported";

type ProviderIdentifiers = {
  npi: string; npiVerification: VerificationStatus; npiVerificationNote: string;
  caqhId: string; caqhVerification: VerificationStatus; caqhVerificationNote: string;
  licenseNumber: string; licenseVerification: VerificationStatus; licenseVerificationNote: string;
  casacNumber: string; casacLevel: string; casacEffectiveDate: string; casacExpirationDate: string;
  casacVerification: VerificationStatus; casacVerificationNote: string;
  additionalCredentials: readonly string[];
  education: readonly string[];
  completedTraining: readonly string[];
  trainingInProgress: readonly string[];
  stateMandatedTraining: readonly string[];
  publications: readonly string[];
  publicationsStatus: string;
};

const providers: Record<string, Readonly<ProviderIdentifiers>> = {
  "kenseener carpenter": Object.freeze({
    npi: "1417470964",
    npiVerification: "verified",
    npiVerificationNote: "Confirmed active against the federal NPI Registry (NPPES), September 2026.",
    caqhId: "14077537",
    caqhVerification: "self_reported",
    caqhVerificationNote: "Provider-reported. CAQH ProView is a private, login-only system — confirm current attestation directly in your CAQH account.",
    licenseNumber: "103235",
    licenseVerification: "self_reported",
    licenseVerificationNote: "Provider-reported. Confirm current status directly at NYSED's Office of the Professions license verification (op.nysed.gov).",
    casacNumber: "CASAC-26242", casacLevel: "Master Level",
    casacEffectiveDate: "2025-01-03", casacExpirationDate: "2028-01-02",
    casacVerification: "self_reported",
    casacVerificationNote: "Provider-reported. Confirm current status directly with NY OASAS credentialing.",
    // Unless individually noted otherwise, all pending and future certifications/trainings
    // are issued via PESI/Evergreen, per owner instruction (Sept 13, 2026). None of these
    // are independently verifiable by Claude from outside the provider's own accounts — PESI/
    // Evergreen and Lehman's Field Education office have no public certificate registries —
    // so every entry here is self-reported unless a specific external check is noted.
    additionalCredentials: Object.freeze([
      "CCTP — Certified Clinical Trauma Professional (via PESI/Evergreen; self-reported)",
      "CGP — Certified Geriatric Provider (via PESI/Evergreen; self-reported)",
      "CIMHP — Certified Integrative Mental Health Provider (via PESI/Evergreen; self-reported)",
      "IFSP — Integrated Family Systems Provider (via PESI/Evergreen; self-reported)",
      "SIFI — Seminar in Field Instruction (Lehman College; Director of Field Placement Peter Neidt; self-reported)",
    ]),
    trainingInProgress: Object.freeze(["Military-related training (provider-reported)"]),
    // State-mandated compliance training, tracked separately from elective CE above because
    // it is a legal/employment requirement rather than clinical continuing education.
    // Mandated Reporter training is independently verified directly against NYS OCFS's own
    // Mandated Reporter Resource Center training-history lookup (nysmandatedreporter.org),
    // confirmed September 13, 2026 under the owner's registered email. Full recorded history:
    // Mandated Reporter Web-Based Online Training completed 11/09/2012, 05/15/2014, 10/01/2021,
    // and 09/17/2024, plus a Mandated Reporter: Intellectual and Developmental Disabilities
    // Addendum completed 05/28/2026 — the most recent entry on file. Sexual Harassment
    // Prevention Training has no equivalent state-run lookup (it's employer/vendor-administered,
    // not centrally registered), so it remains self-reported/pending until the owner's planned
    // file-organization project (consolidating certificates from multiple devices onto new USB
    // storage) lets her locate the source document — add its exact completion date and renewal
    // cadence at that point so credentialRenewalAlerts() can track it the same way it tracks
    // CASAC-M.
    stateMandatedTraining: Object.freeze([
      "Mandated Reporter / Child Abuse Identification Training — most recently completed May 28, 2026 (Intellectual and Developmental Disabilities Addendum); prior core training completed September 17, 2024 — independently verified via NYS OCFS Mandated Reporter Resource Center, September 13, 2026",
      "Sexual Harassment Prevention Training (New York State requires annual completion) — recently completed; exact completion date pending owner's file-organization project (self-reported)",
    ]),
    // Degree titles and issue dates explicitly confirmed by owner (Sept 13, 2026): Lehman
    // College degree is MS (Master of Science, Social Work) — not MSW, despite Lehman/CUNY's
    // own registrar credential using "Master of Social Work" elsewhere; City College degree is
    // MA (Master of Arts, Psychology). This resolves the earlier flagged MS/MSW discrepancy.
    education: Object.freeze([
      "Master of Arts, Psychology — City College — May 28, 2009",
      "Master of Science, Social Work — Lehman College — May 28, 2015",
      "Bachelor of Arts, Psychology — Lehman College — June 3, 2004",
    ]),
    completedTraining: Object.freeze([
      "3-Day Certified Integrative Mental Health Provider (CIMHP) Training Course — August 19, 2026",
      "Evidence-Based Trauma Treatments & Interventions — December 17, 2024",
      "The 10 Core Competencies of Trauma, PTSD, Grief & Loss — June 18, 2024",
      "Culture into Practice: Improving the End of Life Experience — July 25, 2026",
      "Foundations of Somatic Therapy for Trauma: The 9 Key Techniques for Effective Body-Based Therapy — May 28, 2026",
      "Somatic Therapy to Tame the Survival Response and Heal Implicit Trauma Memories — May 28, 2026",
      "Somatic Therapy to Create Healthy Attachment: Strategies to Heal Development and Relational Trauma — May 28, 2026",
    ]),
    publications: Object.freeze([]),
    publicationsStatus: "None yet — pilot study and related research pending IRB approval.",
  }),
};

const emptyIdentifiers: Readonly<ProviderIdentifiers> = Object.freeze({
  npi: "", npiVerification: "self_reported", npiVerificationNote: "",
  caqhId: "", caqhVerification: "self_reported", caqhVerificationNote: "",
  licenseNumber: "", licenseVerification: "self_reported", licenseVerificationNote: "",
  casacNumber: "", casacLevel: "", casacEffectiveDate: "", casacExpirationDate: "",
  casacVerification: "self_reported", casacVerificationNote: "",
  additionalCredentials: Object.freeze([]), education: Object.freeze([]),
  completedTraining: Object.freeze([]), trainingInProgress: Object.freeze([]),
  stateMandatedTraining: Object.freeze([]),
  publications: Object.freeze([]), publicationsStatus: "",
});

export function providerIdentifiersForName(name: string = "") {
  return providers[name.trim().toLowerCase().replace(/\s+/g, " ")] || emptyIdentifiers;
}

export function providerNpiForName(name: string = "") {
  return providerIdentifiersForName(name).npi;
}

export function providerSignatureText(name: string = "", savedNpi: string = "", savedLicense: string = "") {
  if (!name.trim()) return "Not signed";
  const npi = /^\d{10}$/.test(savedNpi) ? savedNpi : providerNpiForName(name);
  const license = savedLicense || providerIdentifiersForName(name).licenseNumber;
  return [name, npi && `NPI: ${npi}`, license && `License: ${license}`].filter(Boolean).join(" | ");
}

export function documentSignatureText(signature: {
  signer?: string; authenticatedRole?: string; role?: string; providerNpi?: string; providerLicense?: string;
}) {
  const role = (signature.authenticatedRole || signature.role || "").toLowerCase();
  return ["provider", "owner", "clinical_staff"].includes(role)
    ? providerSignatureText(signature.signer || "", signature.providerNpi, signature.providerLicense)
    : signature.signer || "Not signed";
}

// Standing, renewal-driven alerts for time-bound credentials. An alert is generated once a
// credential enters its renewal window and — by design — keeps appearing on every load until
// the record's expiration date is actually updated to a later date. There is currently no
// automatic document-scan recognition that updates dates on its own; today, clearing an alert
// means the practice owner (or a developer on her behalf) updates the relevant date here, or in
// whatever editable record replaces this file. Uploading the renewed certificate to the
// Document Library is good practice for the chart, but by itself does not clear this alert.
export type CredentialAlert = {
  id: string;
  label: string;
  severity: "expired" | "due_soon";
  message: string;
  expirationDate: string;
};

const RENEWAL_WINDOW_DAYS = 90;

export function credentialRenewalAlerts(name: string = "", today: Date = new Date()): CredentialAlert[] {
  const identifiers = providerIdentifiersForName(name);
  const alerts: CredentialAlert[] = [];

  const checkExpiration = (id: string, label: string, expirationDate: string) => {
    if (!expirationDate) return;
    const expires = new Date(`${expirationDate}T00:00:00`);
    if (Number.isNaN(expires.getTime())) return;
    const daysRemaining = Math.ceil((expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) {
      alerts.push({
        id, label, severity: "expired", expirationDate,
        message: `${label} expired on ${expirationDate}. Renew immediately and update the expiration date in this record — this alert will keep appearing until it is renewed and the record is updated.`,
      });
    } else if (daysRemaining <= RENEWAL_WINDOW_DAYS) {
      alerts.push({
        id, label, severity: "due_soon", expirationDate,
        message: `${label} expires ${expirationDate} (in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}). Begin renewal now — this alert will keep appearing until it is renewed and the record is updated with the new date.`,
      });
    }
  };

  checkExpiration("casac", `${identifiers.casacLevel ? `${identifiers.casacLevel} ` : ""}CASAC credential (${identifiers.casacNumber || "unnumbered"})`, identifiers.casacExpirationDate);

  return alerts;
}
