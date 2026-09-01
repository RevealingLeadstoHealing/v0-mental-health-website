// Provider identifiers supplied by the practice owner.
type ProviderIdentifiers = {
  npi: string; caqhId: string; licenseNumber: string;
  casacNumber: string; casacLevel: string; casacEffectiveDate: string; casacExpirationDate: string;
};
const providers: Record<string, Readonly<ProviderIdentifiers>> = {
  "kenseener carpenter": Object.freeze({
    npi: "1417470964", caqhId: "14077537", licenseNumber: "103235",
    casacNumber: "CASAC-26242", casacLevel: "Master Level",
    casacEffectiveDate: "2025-01-03", casacExpirationDate: "2028-01-02",
  }),
};
const emptyIdentifiers = Object.freeze({ npi: "", caqhId: "", licenseNumber: "", casacNumber: "", casacLevel: "", casacEffectiveDate: "", casacExpirationDate: "" });

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
