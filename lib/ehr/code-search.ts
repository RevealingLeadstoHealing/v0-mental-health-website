export type ClinicalCode = { code: string; label: string; type?: string; keywords?: string };
export type IndexedCode = ClinicalCode & { searchText: string; codeText: string; words: string[]; order: number };
export type CodeCategory = { name: string; terms: string[]; prefixes: string[] };

const aliases: Record<string, string> = {
  adhd: 'attention deficit', ptsd: 'post traumatic', ocd: 'obsessive',
  gad: 'generalized anxiety', mdd: 'major depressive', asd: 'autistic',
  dysphoria: 'gender identity', alzheimer: 'alzheimer',
};

export const diagnosisCategories: CodeCategory[] = [
  { name: 'Anxiety disorders', terms: ['anxiety', 'anxious', 'gad'], prefixes: ['F41', 'F40', 'F43.22', 'F43.23', 'F06.4'] },
  { name: 'Panic disorder', terms: ['panic'], prefixes: ['F41.0'] },
  { name: 'Depressive disorders', terms: ['depressive', 'depression', 'depressed', 'mdd', 'dysthymia'], prefixes: ['F32', 'F33', 'F34', 'F43.21', 'F43.23'] },
  { name: 'Bipolar and manic disorders', terms: ['bipolar', 'mania', 'manic'], prefixes: ['F31', 'F30'] },
  { name: 'Trauma and stress disorders', terms: ['ptsd', 'trauma', 'traumatic', 'stress'], prefixes: ['F43.1', 'F43.0', 'F43.8', 'F43.9', 'F94.1', 'F94.2'] },
  { name: 'Adjustment disorders', terms: ['adjustment'], prefixes: ['F43.2'] },
  { name: 'Alcohol use disorders', terms: ['alcohol', 'etoh', 'drinking'], prefixes: ['F10'] },
  { name: 'Opioid use disorders', terms: ['opioid', 'opiate', 'heroin', 'fentanyl'], prefixes: ['F11'] },
  { name: 'Cannabis use disorders', terms: ['cannabis', 'marijuana', 'thc', 'weed'], prefixes: ['F12'] },
  { name: 'Sedative use disorders', terms: ['sedative', 'benzodiazepine', 'benzo'], prefixes: ['F13'] },
  { name: 'Cocaine use disorders', terms: ['cocaine', 'crack'], prefixes: ['F14'] },
  { name: 'Stimulant use disorders', terms: ['stimulant', 'methamphetamine', 'amphetamine'], prefixes: ['F15'] },
  { name: 'Substance use disorders', terms: ['substance', 'sud', 'drug', 'addiction'], prefixes: ['F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19'] },
  { name: 'ADHD', terms: ['adhd', 'attention', 'hyperactivity'], prefixes: ['F90'] },
  { name: 'Obsessive-compulsive disorders', terms: ['ocd', 'obsessive', 'compulsive'], prefixes: ['F42'] },
  { name: 'Eating disorders', terms: ['eating', 'anorexia', 'bulimia', 'binge'], prefixes: ['F50'] },
  { name: 'Psychotic disorders', terms: ['psychosis', 'psychotic', 'schizophrenia', 'schizoaffective'], prefixes: ['F20', 'F21', 'F22', 'F23', 'F24', 'F25', 'F28', 'F29'] },
  { name: 'Personality disorders', terms: ['personality', 'borderline', 'bpd'], prefixes: ['F60'] },
  { name: 'Autism spectrum', terms: ['autism', 'autistic', 'asd'], prefixes: ['F84'] },
  { name: 'Sleep disorders', terms: ['sleep', 'insomnia'], prefixes: ['F51', 'G47.0'] },
  { name: 'Grief and bereavement', terms: ['grief', 'bereavement'], prefixes: ['Z63.4', 'F43.81'] },
  { name: 'Relationship and family problems', terms: ['relationship', 'marital', 'family', 'partner'], prefixes: ['Z63'] },
];

const normalize = (value: string) => value.toLowerCase().replace(/[.\-]/g, '').replace(/\s+/g, ' ').trim();
const normalizeCode = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export function indexCodes(codes: ClinicalCode[]): IndexedCode[] {
  return codes.map((item, order) => {
    const searchText = normalize(`${item.code} ${item.label} ${item.keywords || ''}`);
    const raw = `${item.code} ${item.label} ${item.keywords || ''}`.toLowerCase();
    const words = [...new Set([...raw.split(/[^a-z0-9]+/), ...searchText.split(/[^a-z0-9]+/), normalizeCode(item.code)].filter(Boolean))];
    return { ...item, searchText, codeText: normalizeCode(item.code), words, order };
  });
}

export function matchingCategories(query: string, categories: CodeCategory[] = diagnosisCategories) {
  const entered = normalize(query);
  if (entered.length < 3 || /\d/.test(entered)) return [];
  return categories.filter(category => category.terms.some(term => term.startsWith(entered) || (entered.length > term.length && entered.startsWith(term))));
}

function inCategory(item: IndexedCode, categories: CodeCategory[]) {
  return categories.some(category => category.prefixes.some(prefix => item.codeText.startsWith(normalizeCode(prefix))));
}

function score(item: IndexedCode, words: string[], codeQuery: string, categories: CodeCategory[]) {
  let value = 0;
  if (codeQuery && item.codeText.startsWith(codeQuery)) value += 5000 - (item.codeText.length - codeQuery.length);
  if (categories.length && inCategory(item, categories)) value += 3000;
  if (item.keywords) value += 500;
  if (item.code.startsWith('F')) value += 300;
  else if (item.code.startsWith('Z')) value += 100;
  for (const word of words) if (item.words.some(candidate => candidate.startsWith(word))) value += 200;
  return value;
}

export function searchCodes(codes: IndexedCode[], query: string, limit = 50) {
  const entered = normalize(query);
  if (!entered) return { matches: [] as IndexedCode[], total: 0, categories: [] as CodeCategory[] };
  const alternatives = [entered, ...(aliases[entered] ? [normalize(aliases[entered])] : [])];
  const categories = matchingCategories(entered);
  const codeQuery = entered.includes(' ') ? '' : normalizeCode(entered);
  const words = entered.split(' ');
  const scored: { item: IndexedCode; value: number }[] = [];
  for (const item of codes) {
    const textMatch = alternatives.some(text => text.split(' ').every(word => item.words.some(candidate => candidate.startsWith(word))));
    if (textMatch || (categories.length && inCategory(item, categories))) scored.push({ item, value: score(item, words, codeQuery, categories) });
  }
  scored.sort((a, b) => b.value - a.value || a.item.order - b.item.order);
  return { matches: scored.slice(0, limit).map(entry => entry.item), total: scored.length, categories };
}

export function commonCodes(codes: IndexedCode[], limit = 50) {
  return codes.filter(item => item.keywords).sort((a, b) => a.code.localeCompare(b.code)).slice(0, limit);
}

export function psychotherapyTimeGuidance(value: string | number) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  if (minutes < 16) return 'Under 16 minutes: the timed individual psychotherapy codes below do not apply.';
  if (minutes <= 37) return 'Individual psychotherapy time range: 90832 (16–37 minutes).';
  if (minutes <= 52) return 'Individual psychotherapy time range: 90834 (38–52 minutes).';
  return 'Individual psychotherapy time range: 90837 (53 minutes or more).';
}
