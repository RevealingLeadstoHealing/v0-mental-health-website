// State licensure status for the provider Infrastructure page (owner-reported).
// To update later: edit the `status` (and `licenseNumber`) of the matching row below.
// Pending/planned rows must keep licenseNumber empty; never show them as licensed.

export type LicensureStatus = "Licensed" | "Pending" | "Planned";

export type StateLicensure = {
  state: string;
  code: string;
  status: LicensureStatus;
  licenseNumber: string; // "" = none / not yet known
  note: string;
  issued?: string; // YYYY-MM-DD; "" or omitted = not known
  expires?: string; // YYYY-MM-DD; "" or omitted = not on file
  expiresEstimated?: boolean; // true = expires is an estimate, not an issuing-body date
  expiresNote?: string; // shown next to the expiration date
  licenseType?: string;
  verification?: "document_on_file" | "self_reported" | "verified";
};

export const STATE_LICENSURE: StateLicensure[] = [
  {
    state: "New York", code: "NY", status: "Licensed", licenseNumber: "103235", note: "",
    issued: "2026-05-31",
    expires: "2029-05-31", expiresEstimated: true,
    expiresNote: "Estimated — verify the registered-through date on NYSED (op.nysed.gov)",
  },
  {
    state: "Florida", code: "FL", status: "Licensed", licenseNumber: "7382", note: "Telehealth registration, status Clear",
    issued: "2026-10-01", // approximate (owner: about October 1, 2026)
    expires: "",
    expiresNote: "Expiration not on file — look it up",
    verification: "document_on_file",
  },
  {
    state: "Idaho", code: "ID", status: "Licensed", licenseNumber: "1081643", note: "Active",
    licenseType: "Mental or Behavioral Telehealth - Social Worker",
    issued: "2026-11-06", expires: "2028-11-06",
    verification: "document_on_file",
  },
  { state: "Vermont", code: "VT", status: "Pending", licenseNumber: "", note: "Application pending; awaiting board verification" },
  { state: "Delaware", code: "DE", status: "Pending", licenseNumber: "", note: "Application pending; awaiting board verification" },
  // COLORADO: change status to "Licensed" and add licenseNumber once the approval letter arrives.
  { state: "Colorado", code: "CO", status: "Pending", licenseNumber: "", note: "Application pending; awaiting approval letter" },
  { state: "Georgia", code: "GA", status: "Planned", licenseNumber: "", note: "Application not yet submitted" },
  { state: "South Carolina", code: "SC", status: "Planned", licenseNumber: "", note: "Application not yet submitted" },
];

export function licensureLicenseText(row: StateLicensure): string {
  if (row.status !== "Licensed") return "No license number (not licensed in this state yet)";
  return row.licenseNumber ? `License #${row.licenseNumber}` : "License number: TO BE ENTERED";
}

export function licensureDatesText(row: StateLicensure): string {
  if (row.status !== "Licensed") return "";
  const parts: string[] = [];
  if (row.licenseType) parts.push(row.licenseType);
  if (row.issued) parts.push(`Issued ${row.issued}`);
  if (row.expires) parts.push(`Expires ${row.expires}${row.expiresEstimated ? " (estimated)" : ""}`);
  if (row.expiresNote) parts.push(row.expiresNote);
  return parts.join(". ");
}
