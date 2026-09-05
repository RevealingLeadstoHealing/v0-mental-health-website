export type ClinicalCode = { code: string; label: string; type?: string; keywords?: string };

const aliases: Record<string, string> = {
  adhd: 'attention deficit', ptsd: 'post traumatic', ocd: 'obsessive',
  gad: 'generalized anxiety', mdd: 'major depressive', asd: 'autistic',
  dysphoria: 'gender identity', alzheimer: 'alzheimer',
};
const normalize = (value: string) => value.toLowerCase().replace(/[.\-]/g, '').replace(/\s+/g, ' ').trim();

export function indexCodes(codes: ClinicalCode[]) {
  return codes.map(item => ({ ...item, searchText: normalize(`${item.code} ${item.label} ${item.keywords || ''}`) }));
}

export function searchCodes(codes: ReturnType<typeof indexCodes>, query: string, limit = 50) {
  const entered = normalize(query);
  if (!entered) return { matches: [], total: 0 };
  const alternatives = [entered, ...(aliases[entered] ? [normalize(aliases[entered])] : [])];
  const matches: ClinicalCode[] = []; let total = 0;
  for (const item of codes) {
    if (alternatives.some(text => text.split(' ').every(word => item.searchText.includes(word)))) {
      total++;
      if (matches.length < limit) matches.push(item);
    }
  }
  return { matches, total };
}

export function psychotherapyTimeGuidance(value: string | number) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  if (minutes < 16) return 'Under 16 minutes: the timed individual psychotherapy codes below do not apply.';
  if (minutes <= 37) return 'Individual psychotherapy time range: 90832 (16–37 minutes).';
  if (minutes <= 52) return 'Individual psychotherapy time range: 90834 (38–52 minutes).';
  return 'Individual psychotherapy time range: 90837 (53 minutes or more).';
}
