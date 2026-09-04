import { affirmationLibrary } from "./affirmation-library.ts";

const themeTerms = [
  { signals: ["anxiety", "panic", "worry", "ground", "stress"], terms: ["breath", "present moment", "calm", "temporary", "steady"] },
  { signals: ["trauma", "ptsd", "safety", "trigger", "abuse"], terms: ["safety", "survival", "guarded", "trigger", "past experiences"] },
  { signals: ["grief", "loss", "bereave", "mourning"], terms: ["grief", "mourning", "loved and lost", "remember"] },
  { signals: ["esteem", "worth", "confidence", "shame", "self-critical"], terms: ["worthy", "value", "strength", "dignity", "compassion"] },
  { signals: ["boundary", "assert", "relationship", "couple", "conflict"], terms: ["boundary", "relationship", "communicate", "connection", "mutual"] },
  { signals: ["substance", "recovery", "relapse", "urge", "addiction"], terms: ["recovery", "urge", "support", "begin again", "wellness"] },
  { signals: ["identity", "gender", "sexual", "belong", "authentic"], terms: ["identity", "authentic", "belong", "differences", "voice"] },
  { signals: ["caregiver", "parent", "caregiving", "burnout"], terms: ["caregiver", "caring for others", "receive help", "responsibility", "rest"] },
  { signals: ["body", "eating", "appearance", "dysphoria", "health"], terms: ["body", "nourishment", "appearance", "health", "take up space"] },
  { signals: ["adhd", "attention", "focus", "learning", "task"], terms: ["attention", "task", "learning", "structure", "concentration"] },
  { signals: ["change", "transition", "adjustment", "uncertain"], terms: ["change", "transition", "uncertainty", "adapt", "revise"] },
  { signals: ["depress", "hopeless", "motivation", "sad"], terms: ["hope", "small step", "future", "progress", "another opportunity"] },
] as const;

export function chartInformedAffirmations(context: unknown, limit = 6) {
  const text = String(context || "").toLowerCase();
  const matchedTerms = themeTerms.filter(theme => theme.signals.some(signal => text.includes(signal))).flatMap(theme => theme.terms);
  const scored = affirmationLibrary.map((affirmation, index) => ({
    affirmation,
    index,
    score: matchedTerms.reduce((score, term) => score + (affirmation.toLowerCase().includes(term) ? 1 : 0), 0),
  }));
  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  return scored.slice(0, Math.max(1, Math.min(limit, 10))).map(item => item.affirmation);
}
