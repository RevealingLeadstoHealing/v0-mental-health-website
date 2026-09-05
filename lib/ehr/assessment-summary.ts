const assessmentNames: Record<string, string> = {
  phq9: "PHQ-9", gad7: "GAD-7", suicideRisk: "Suicide Risk Assessment",
  substanceUse: "Substance Use / SBIRT", dast: "DAST-10", aces: "ACES",
  wecare: "WECARE", violenceRisk: "Violence Risk Assessment", safetyPlan: "Safety Plan",
};
export const assessmentTabs: Record<string, string> = {
  phq9: "phq9", gad7: "gad7", suicideRisk: "suicide", substanceUse: "substance",
  dast: "dast", aces: "aces", wecare: "wecare", violenceRisk: "violence", safetyPlan: "safety",
};
const humanize = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, c => c.toUpperCase());
export function completedAssessmentSummary(assessments: Record<string, any> = {}) {
  return Object.entries(assessments || {}).flatMap(([key, value]) => {
    if (!value || typeof value !== "object" || !value.completedAt) return [];
    const name = value.label || value.title || assessmentNames[key] || humanize(key);
    const lines = [`${name} — Completed: ${value.completedAt}`];
    for (const [field, label] of [["score", "Score"], ["severity", "Severity"], ["riskLevel", "Risk level"], ["concernCount", "Concern count"], ["notes", "Notes"], ["clinicalSummary", "Clinical summary"]]) {
      if (value[field] !== undefined && value[field] !== null && value[field] !== "") lines.push(`${label}: ${value[field]}`);
    }
    if (value.data && typeof value.data === "object") {
      for (const [field, detail] of Object.entries(value.data)) {
        if ((typeof detail === "string" && detail.trim()) || typeof detail === "number" || typeof detail === "boolean") lines.push(`${humanize(field)}: ${detail}`);
      }
    }
    return [{ key, name, completedAt: value.completedAt, text: lines.join("\n"), result: JSON.parse(JSON.stringify(value)) }];
  });
}
export function composeBiopsychosocialSummary(narrative: string, assessments: Record<string, any> = {}) {
  const completed = completedAssessmentSummary(assessments);
  return [narrative?.trim(), completed.length ? `Completed Assessments\n\n${completed.map(item => item.text).join("\n\n")}` : ""].filter(Boolean).join("\n\n");
}
