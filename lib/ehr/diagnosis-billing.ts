export const DIAGNOSIS_FIELDS = ['primaryDiagnosis', 'secondaryDiagnosis', 'tertiaryDiagnosis', 'fourthDiagnosis'] as const;
export type DiagnosisField = typeof DIAGNOSIS_FIELDS[number];
export type DiagnosisRank = 'primary' | 'secondary' | 'tertiary' | 'quaternary';
export const DIAGNOSIS_RANKS: DiagnosisRank[] = ['primary', 'secondary', 'tertiary', 'quaternary'];
export const INTERPRETER_CODE = 'T1013';

type DiagnosisRecord = Partial<Record<DiagnosisField, unknown>> & { diagnoses?: unknown };
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
export const codeOf = (entry: string) => entry.split('|')[0].trim();

export function selectedDiagnoses(record: DiagnosisRecord | null | undefined) {
  return DIAGNOSIS_FIELDS.map(field => text(record?.[field])).filter(Boolean);
}

export function claimDiagnoses(record: DiagnosisRecord | null | undefined) {
  return DIAGNOSIS_FIELDS.flatMap((field, index) => {
    const label = text(record?.[field]);
    return label ? [{ code: codeOf(label), label, rank: DIAGNOSIS_RANKS[index] }] : [];
  });
}

export function otherDiagnoses(record: DiagnosisRecord | null | undefined) {
  const selected = new Set(selectedDiagnoses(record));
  const list = Array.isArray(record?.diagnoses) ? record!.diagnoses as unknown[] : [];
  return list.map(text).filter(entry => entry && !selected.has(entry));
}

export function diagnosisPatch(record: DiagnosisRecord | null | undefined, field: DiagnosisField, value: string) {
  const others = otherDiagnoses(record);
  const next = { ...(record || {}), [field]: value };
  return { [field]: value, diagnoses: [...new Set([...selectedDiagnoses(next), ...others])] };
}

export function splitServiceCodes(codes: unknown) {
  const list = (Array.isArray(codes) ? codes : []).map(text).filter(Boolean);
  const interpreterCode = list.find(entry => codeOf(entry) === INTERPRETER_CODE) || '';
  const serviceCode = list.find(entry => entry !== interpreterCode) || '';
  const otherCodes = list.filter(entry => entry !== interpreterCode && entry !== serviceCode);
  return { serviceCode, interpreterCode, otherCodes };
}

export function mergeServiceCodes(parts: { serviceCode?: string; interpreterCode?: string; otherCodes?: string[] }) {
  return [...new Set([text(parts.serviceCode), ...(parts.otherCodes || []).map(text), text(parts.interpreterCode)].filter(Boolean))];
}
