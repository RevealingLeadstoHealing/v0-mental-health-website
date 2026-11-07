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
};

export const STATE_LICENSURE: StateLicensure[] = [
  { state: "New York", code: "NY", status: "Licensed", licenseNumber: "103235", note: "" },
  { state: "Florida", code: "FL", status: "Licensed", licenseNumber: "7382", note: "Telehealth registration, status Clear" },
  // IDAHO LICENSE NUMBER: put it between the quotes on the next line (licenseNumber: "").
  { state: "Idaho", code: "ID", status: "Licensed", licenseNumber: "", note: "Telehealth; license number to be entered" },
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
