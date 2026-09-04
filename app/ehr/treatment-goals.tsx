"use client";
import React from 'react';
import { newGoal, newObjective, type TreatmentGoal } from '../../lib/ehr/treatment-goals';

const field = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm';
export function TreatmentGoalEditor({ goals, onChange, disabled = false }: { goals: TreatmentGoal[]; onChange: (goals: TreatmentGoal[]) => void; disabled?: boolean }) {
  const update = (id: string, patch: Partial<TreatmentGoal>) => onChange(goals.map(goal => goal.id === id ? { ...goal, ...patch } : goal));
  return <div className="space-y-4">{(['long', 'short'] as const).map(term => <fieldset key={term} disabled={disabled} className="rounded-xl border p-3 space-y-3">
    <legend className="font-semibold">{term === 'long' ? 'Long-term goals' : 'Short-term goals'}</legend>
    {goals.filter(goal => goal.term === term).map((goal, index) => <div key={goal.id} className="space-y-2 rounded-xl border p-3">
      <label className="block text-sm font-medium">Goal {index + 1}<textarea className={field} value={goal.description} onChange={event => update(goal.id, { description: event.target.value })} placeholder={`${term === 'long' ? 'Long-term' : 'Short-term'} goal`} /></label>
      <label className="block text-sm">Goal {index + 1} projected completion<input className={field} type="date" value={goal.targetDate} onChange={event => update(goal.id, { targetDate: event.target.value })} /></label>
      {goal.objectives.map((objective, objectiveIndex) => <div key={objective.id} className="space-y-2 pl-3">
        <label className="block text-sm">Objective {index + 1}.{objectiveIndex + 1}<textarea className={field} value={objective.description} onChange={event => update(goal.id, { objectives: goal.objectives.map(item => item.id === objective.id ? { ...item, description: event.target.value } : item) })} placeholder="Measurable objective: what will change, how much, and how progress will be assessed" /></label>
        <label className="block text-sm">Objective {index + 1}.{objectiveIndex + 1} projected completion<input className={field} type="date" value={objective.targetDate} onChange={event => update(goal.id, { objectives: goal.objectives.map(item => item.id === objective.id ? { ...item, targetDate: event.target.value } : item) })} /></label>
        {goal.objectives.length > 1 && <button type="button" className="text-xs underline" onClick={() => update(goal.id, { objectives: goal.objectives.filter(item => item.id !== objective.id) })}>Remove objective {index + 1}.{objectiveIndex + 1}</button>}
      </div>)}
      <button type="button" className="text-sm underline" onClick={() => update(goal.id, { objectives: [...goal.objectives, newObjective()] })}>Add objective to goal {index + 1}</button>
      {goals.filter(item => item.term === term).length > 1 && <button type="button" className="block text-xs underline" onClick={() => onChange(goals.filter(item => item.id !== goal.id))}>Remove goal {index + 1}</button>}
    </div>)}
    <button type="button" className="rounded-xl border px-3 py-2 text-sm" onClick={() => onChange([...goals, newGoal(term)])}>Add {term === 'long' ? 'long-term' : 'short-term'} goal</button>
  </fieldset>)}</div>;
}

type PlanSummary = { goals?: TreatmentGoal[]; longTermGoal?: string; shortTermGoal?: string; primaryDiagnosis?: string; secondaryDiagnosis?: string; tertiaryDiagnosis?: string; plannedServiceCodes?: string };
export function TreatmentGoalSummary({ plan }: { plan: PlanSummary }) {
  return <>
    {plan.primaryDiagnosis && <p className="text-sm mt-2"><strong>Primary diagnosis:</strong> {plan.primaryDiagnosis}</p>}
    {plan.secondaryDiagnosis && <p className="text-sm"><strong>Secondary diagnosis:</strong> {plan.secondaryDiagnosis}</p>}
    {plan.tertiaryDiagnosis && <p className="text-sm"><strong>Additional diagnosis:</strong> {plan.tertiaryDiagnosis}</p>}
    {plan.plannedServiceCodes && <p className="text-sm"><strong>Planned CPT / HCPCS services:</strong> {plan.plannedServiceCodes}</p>}
    <GoalDetails plan={plan} />
  </>;
}
function GoalDetails({ plan }: { plan: PlanSummary }) {
  if (!Array.isArray(plan.goals) || !plan.goals.length) return <><p className="text-sm mt-2 whitespace-pre-wrap"><strong>Long-term:</strong> {plan.longTermGoal}</p><p className="text-sm mt-1 whitespace-pre-wrap"><strong>Short-term:</strong> {plan.shortTermGoal}</p></>;
  return <div className="space-y-3 mt-2">{(['long', 'short'] as const).map(term => <section key={term}>
    <h4 className="text-sm font-semibold">{term === 'long' ? 'Long-term goals' : 'Short-term goals'}</h4>
    {plan.goals!.filter(goal => goal.term === term).map((goal, index) => <div key={goal.id} className="text-sm mt-2">
      <p className="whitespace-pre-wrap"><strong>Goal {index + 1}:</strong> {goal.description}</p>
      <p>Projected completion: {goal.targetDate || 'Not entered'}</p>
      {(goal.objectives || []).map((objective, objectiveIndex) => <div key={objective.id} className="pl-3 mt-1"><p className="whitespace-pre-wrap"><strong>Objective {index + 1}.{objectiveIndex + 1}:</strong> {objective.description}</p><p>Projected completion: {objective.targetDate || 'Not entered'}</p></div>)}
    </div>)}
  </section>)}</div>;
}
