type AssessmentResult = Record<string, any>;

// Keep historical results flat so repeated saves do not recursively copy history.
function snapshot(result: AssessmentResult) {
  const { history: _history, ...fields } = result;
  return JSON.parse(JSON.stringify(fields));
}

export function assessmentHistory(result?: AssessmentResult) {
  if (!result || typeof result !== "object") return [];
  const previous = Array.isArray(result.history)
    ? result.history.filter(item => item && typeof item === "object" && item.completedAt).map(snapshot)
    : [];
  return result.completedAt ? [...previous, snapshot(result)] : previous;
}

export function recordAssessment(previous: AssessmentResult | undefined, next: AssessmentResult) {
  if (!next.completedAt) throw new Error("A completed assessment must include its completion date.");
  return { ...snapshot(next), history: assessmentHistory(previous) };
}
