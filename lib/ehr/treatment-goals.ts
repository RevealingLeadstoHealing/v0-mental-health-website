export type TreatmentObjective = { id: string; description: string; targetDate: string };
export type TreatmentGoal = { id: string; term: 'long' | 'short'; description: string; targetDate: string; objectives: TreatmentObjective[] };
export const newObjective = (): TreatmentObjective => ({ id: crypto.randomUUID(), description: '', targetDate: '' });
export const newGoal = (term: TreatmentGoal['term']): TreatmentGoal => ({ id: crypto.randomUUID(), term, description: '', targetDate: '', objectives: [newObjective()] });
export const newTreatmentGoals = () => [newGoal('long'), newGoal('short')];
export function summarizeTreatmentGoals(goals: TreatmentGoal[]) {
  const summary = (term: TreatmentGoal['term']) => goals.filter(goal => goal.term === term && goal.description.trim()).map((goal, index) => `${index + 1}. ${goal.description}`).join('\n');
  return { longTermGoal: summary('long'), shortTermGoal: summary('short') };
}
