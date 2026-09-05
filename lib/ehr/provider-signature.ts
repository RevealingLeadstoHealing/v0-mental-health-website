// Provider identifiers supplied by the practice owner.
type ProviderIdentifiers = {
  npi: string; caqhId: string; licenseNumber: string;
  casacNumber: string; casacLevel: string; casacEffectiveDate: string; casacExpirationDate: string;
  additionalCredentials: readonly string[];
  education: readonly string[];
  completedTraining: readonly string[];
  trainingInProgress: readonly string[];
};
const providers: Record<string, Readonly<ProviderIdentifiers>> = {
  "kenseener carpenter": Object.freeze({
    npi: "1417470964", caqhId: "14077537", licenseNumber: "103235",
    casacNumber: "CASAC-26242", casacLevel: "Master Level",
    casacEffectiveDate: "2025-01-03", casacExpirationDate: "2028-01-02",
    additionalCredentials: Object.freeze(["CCTP (provider-reported)"]),
    trainingInProgress: Object.freeze(["Military-related training (provider-reported)"]),
    education: Object.freeze([
      "Master of Arts, Psychology — City College — May 28, 2009",
      "Master of Social Work — Lehman College — May 28, 2015",
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
  }),
};
const emptyIdentifiers = Object.freeze({ npi: "", caqhId: "", licenseNumber: "", casacNumber: "", casacLevel: "", casacEffectiveDate: "", casacExpirationDate: "", additionalCredentials: Object.freeze([]), education: Object.freeze([]), completedTraining: Object.freeze([]), trainingInProgress: Object.freeze([]) });

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
