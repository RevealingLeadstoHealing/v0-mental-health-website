export type BillingJurisdiction = "NY" | "FL";

export type PayerProduct = {
  name: string;
  type: "Commercial" | "Medicaid" | "Medicare" | "Marketplace" | "Child Health Plus" | "Essential Plan" | "Behavioral Health" | "Other";
};

export type PayerGroup = {
  id: string;
  name: string;
  aliases: string[];
  products: PayerProduct[];
};

const p = (name: string, type: PayerProduct["type"] | "CHP" | "Essential" | "Behavioral"): PayerProduct => ({
  name,
  type: type === "CHP" ? "Child Health Plus" : type === "Essential" ? "Essential Plan" : type === "Behavioral" ? "Behavioral Health" : type,
});

export const payerCatalog: Record<BillingJurisdiction, PayerGroup[]> = {
  NY: [
    { id: "aetna", name: "Aetna", aliases: ["aetna"], products: [p("Aetna Commercial", "Commercial"), p("Aetna Better Health of New York", "Medicaid"), p("Aetna Medicare Advantage", "Medicare"), p("Aetna Student Health", "Commercial")] },
    { id: "anthem-empire", name: "Anthem / Empire Blue Cross Blue Shield", aliases: ["anthem", "empire", "bcbs", "blue cross"], products: [p("Anthem Commercial", "Commercial"), p("Anthem HealthPlus", "Medicaid"), p("Anthem Essential Plan", "Essential"), p("Anthem Child Health Plus", "CHP"), p("Anthem Medicare Advantage", "Medicare")] },
    { id: "carelon-optum", name: "Behavioral Health", aliases: ["carelon", "beacon", "optum"], products: [p("Carelon Behavioral Health (formerly Beacon)", "Behavioral"), p("Optum Behavioral Health", "Behavioral")] },
    { id: "cigna", name: "Cigna / Evernorth", aliases: ["cigna", "evernorth"], products: [p("Cigna Commercial", "Commercial"), p("Cigna Behavioral Health / Evernorth", "Behavioral"), p("Cigna Medicare Advantage", "Medicare")] },
    { id: "uhc-oxford", name: "UnitedHealthcare / Oxford", aliases: ["unitedhealthcare", "united healthcare", "uhc", "oxford"], products: [p("UnitedHealthcare Commercial", "Commercial"), p("UnitedHealthcare Community Plan of New York", "Medicaid"), p("UnitedHealthcare Essential Plan", "Essential"), p("UnitedHealthcare Child Health Plus", "CHP"), p("UnitedHealthcare Medicare Advantage", "Medicare"), p("Oxford Health Plans", "Commercial")] },
    { id: "healthfirst", name: "Healthfirst", aliases: ["healthfirst", "health first"], products: [p("Healthfirst Medicaid Managed Care", "Medicaid"), p("Healthfirst Essential Plan", "Essential"), p("Healthfirst Child Health Plus", "CHP"), p("Healthfirst Commercial", "Commercial"), p("Healthfirst Medicare Advantage", "Medicare")] },
    { id: "fidelis", name: "Fidelis Care", aliases: ["fidelis", "ambetter"], products: [p("Fidelis Care Medicaid Managed Care", "Medicaid"), p("Fidelis Care Essential Plan", "Essential"), p("Fidelis Care Child Health Plus", "CHP"), p("Fidelis Care Medicare Advantage", "Medicare"), p("Ambetter from Fidelis Care", "Marketplace")] },
    { id: "emblem", name: "EmblemHealth / GHI / HIP", aliases: ["emblem", "ghi", "hip"], products: [p("GHI Commercial", "Commercial"), p("HIP Commercial", "Commercial"), p("HIP Medicaid Managed Care", "Medicaid"), p("HIP Essential Plan", "Essential"), p("HIP Child Health Plus", "CHP"), p("EmblemHealth Medicare Advantage", "Medicare")] },
    { id: "metroplus", name: "MetroPlusHealth", aliases: ["metroplus"], products: [p("MetroPlusHealth Medicaid Managed Care", "Medicaid"), p("MetroPlusHealth Essential Plan", "Essential"), p("MetroPlusHealth Child Health Plus", "CHP"), p("MetroPlusHealth Commercial / Marketplace", "Marketplace"), p("MetroPlusHealth Medicare Advantage", "Medicare")] },
    { id: "1199seiu", name: "1199SEIU", aliases: ["1199", "seiu"], products: [p("1199SEIU National Benefit Fund", "Commercial"), p("1199SEIU Greater New York Benefit Fund", "Commercial"), p("1199SEIU Home Care Benefit Fund", "Commercial")] },
    { id: "molina-affinity", name: "Molina / Affinity", aliases: ["molina", "affinity"], products: [p("Affinity by Molina Healthcare", "Medicaid"), p("Affinity by Molina Essential Plan", "Essential"), p("Molina Healthcare Marketplace", "Marketplace")] },
    { id: "mvp", name: "MVP Health Care", aliases: ["mvp"], products: [p("MVP Commercial", "Commercial"), p("MVP Medicaid Managed Care", "Medicaid"), p("MVP Essential Plan", "Essential"), p("MVP Child Health Plus", "CHP"), p("MVP Medicare Advantage", "Medicare")] },
    { id: "cdphp", name: "CDPHP", aliases: ["cdphp"], products: [p("CDPHP Commercial", "Commercial"), p("CDPHP Medicaid Managed Care", "Medicaid"), p("CDPHP Essential Plan", "Essential"), p("CDPHP Medicare Advantage", "Medicare")] },
    { id: "excellus", name: "Excellus Blue Cross Blue Shield", aliases: ["excellus"], products: [p("Excellus Commercial", "Commercial"), p("Excellus Medicaid Managed Care", "Medicaid"), p("Excellus Essential Plan", "Essential"), p("Excellus Child Health Plus", "CHP"), p("Excellus Medicare Advantage", "Medicare")] },
    { id: "highmark", name: "Highmark Blue Cross Blue Shield", aliases: ["highmark"], products: [p("Highmark Commercial", "Commercial"), p("Highmark Medicaid Managed Care", "Medicaid"), p("Highmark Essential Plan", "Essential"), p("Highmark Child Health Plus", "CHP"), p("Highmark Medicare Advantage", "Medicare")] },
    { id: "other-ny", name: "Other NY Plans", aliases: ["oscar", "vns", "wellcare"], products: [p("Oscar Health Commercial / Marketplace", "Marketplace"), p("VNS Health Medicaid Managed Care", "Medicaid"), p("VNS Health Medicare Advantage", "Medicare"), p("Wellcare Medicare Advantage", "Medicare")] },
    { id: "government-ny", name: "Traditional Government", aliases: ["medicaid", "medicare", "emedny"], products: [p("New York State Medicaid Fee-for-Service", "Medicaid"), p("Traditional Medicare Part A", "Medicare"), p("Traditional Medicare Part B", "Medicare"), p("Traditional Medicare Part D", "Medicare")] },
    { id: "self-pay", name: "Self-Pay / Spending Accounts", aliases: ["self pay", "private pay", "cash", "hsa", "fsa", "hra"], products: [p("Private Pay / Self-Pay", "Other"), p("Health Savings Account (HSA)", "Other"), p("Flexible Spending Account (FSA)", "Other"), p("Health Reimbursement Arrangement (HRA)", "Other")] },
  ],
  FL: [
    { id: "florida-blue", name: "Florida Blue", aliases: ["florida blue", "blueoptions", "bluecare", "blueselect", "myblue", "truli"], products: [p("Florida Blue Commercial", "Commercial"), p("Florida Blue MyBlue", "Marketplace"), p("Florida Blue BlueOptions", "Commercial"), p("Florida Blue BlueCare", "Commercial"), p("Florida Blue BlueSelect", "Commercial"), p("Truli for Health", "Commercial"), p("Florida Blue Medicare Advantage", "Medicare")] },
    { id: "aetna-fl", name: "Aetna Florida", aliases: ["aetna"], products: [p("Aetna Florida Commercial", "Commercial"), p("Aetna Better Health of Florida", "Medicaid"), p("Aetna CVS Health Marketplace", "Marketplace"), p("Aetna Florida Medicare Advantage", "Medicare")] },
    { id: "cigna-fl", name: "Cigna Florida", aliases: ["cigna", "evernorth"], products: [p("Cigna Florida Commercial", "Commercial"), p("Cigna Florida Marketplace", "Marketplace"), p("Cigna Florida Medicare Advantage", "Medicare")] },
    { id: "sunshine", name: "Sunshine / Ambetter", aliases: ["sunshine", "ambetter"], products: [p("Sunshine Health Medicaid Managed Care", "Medicaid"), p("Ambetter from Sunshine Health", "Marketplace"), p("Sunshine / Wellcare Medicare Advantage", "Medicare")] },
    { id: "simply", name: "Simply Healthcare", aliases: ["simply healthcare"], products: [p("Simply Healthcare Medicaid Managed Care", "Medicaid"), p("Simply Healthcare Medicare Advantage", "Medicare")] },
    { id: "humana-fl", name: "Humana Florida", aliases: ["humana", "careplus"], products: [p("Humana Florida Commercial", "Commercial"), p("Humana Florida Medicaid Managed Care", "Medicaid"), p("Humana Gold Plus", "Medicare"), p("CarePlus Health Plans", "Medicare")] },
    { id: "uhc-fl", name: "UnitedHealthcare Florida", aliases: ["unitedhealthcare", "united healthcare", "uhc"], products: [p("UnitedHealthcare Florida Commercial", "Commercial"), p("UnitedHealthcare Community Plan of Florida", "Medicaid"), p("UnitedHealthcare Florida Marketplace", "Marketplace"), p("UnitedHealthcare Florida Medicare Advantage", "Medicare")] },
    { id: "molina-fl", name: "Molina Florida", aliases: ["molina"], products: [p("Molina Healthcare of Florida Medicaid", "Medicaid"), p("Molina Healthcare of Florida Marketplace", "Marketplace"), p("Molina Healthcare of Florida Children's Health Insurance Program", "CHP")] },
    { id: "regional-fl", name: "Florida Regional Plans", aliases: ["community care", "avmed", "orlando health"], products: [p("Community Care Plan Medicaid", "Medicaid"), p("Community Care Plan Commercial / Employer", "Commercial"), p("AvMed Commercial / Marketplace", "Marketplace"), p("AvMed Medicare Advantage", "Medicare"), p("Orlando Health CenterPlan Commercial", "Commercial"), p("Orlando Health CenterPlan Medicare", "Medicare")] },
    { id: "specialty-fl", name: "Florida Medicare Plans", aliases: ["freedom", "optimum", "ultimate", "devoted", "wellcare"], products: [p("Freedom Health Medicare Advantage", "Medicare"), p("Optimum HealthCare Medicare Advantage", "Medicare"), p("Ultimate Health Plans Medicare Advantage", "Medicare"), p("Devoted Health Florida Medicare Advantage", "Medicare"), p("Wellcare by Allwell", "Medicare")] },
    { id: "other-fl", name: "Other Florida Plans", aliases: ["oscar", "children's medical", "cms health"], products: [p("Oscar Health Insurance of Florida", "Marketplace"), p("Children's Medical Services Health Plan", "Medicaid")] },
    { id: "government-fl", name: "Traditional Government", aliases: ["florida medicaid", "medipass", "medicare"], products: [p("Florida Medicaid Fee-for-Service", "Medicaid"), p("Florida MediPass", "Medicaid"), p("Traditional Medicare Part B — Florida", "Medicare")] },
    { id: "self-pay", name: "Self-Pay / Spending Accounts", aliases: ["self pay", "private pay", "cash", "hsa", "fsa", "hra"], products: [p("Private Pay / Self-Pay", "Other"), p("Health Savings Account (HSA)", "Other"), p("Flexible Spending Account (FSA)", "Other"), p("Health Reimbursement Arrangement (HRA)", "Other")] },
  ],
};

export function payerGroupFor(jurisdiction: BillingJurisdiction, value = "") {
  const normalized = value.toLowerCase();
  return payerCatalog[jurisdiction].find(group =>
    group.name.toLowerCase() === normalized || group.products.some(product => product.name.toLowerCase() === normalized) || group.aliases.some(alias => normalized.includes(alias))
  );
}
