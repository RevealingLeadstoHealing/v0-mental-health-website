"use client";
import React from 'react';
import ClinicalCodeInput from './clinical-code-input';
import type { ClinicalCode } from '../../lib/ehr/code-search';
import { DIAGNOSIS_FIELDS, type DiagnosisField, mergeServiceCodes, splitServiceCodes } from '../../lib/ehr/diagnosis-billing';

type Values = Partial<Record<DiagnosisField | 'serviceCode' | 'interpreterCode', string>> & { billingCodes?: string[] };
type Props = {
  values: Values;
  onDiagnosisChange: (field: DiagnosisField, value: string) => void;
  diagnosisOptions: ClinicalCode[];
  billingOptions?: ClinicalCode[];
  onServiceCodeChange?: (value: string) => void;
  onInterpreterCodeChange?: (value: string) => void;
  onBillingCodesChange?: (codes: string[]) => void;
  otherDiagnoses?: string[];
  onRemoveOtherDiagnosis?: (entry: string) => void;
  title?: string;
  description?: string;
  showBilling?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

const diagnosisLabels = ['Diagnosis 1 — primary (required)', 'Diagnosis 2 (optional)', 'Diagnosis 3 (optional)', 'Diagnosis 4 (optional)'];

export default function DiagnosisBillingPanel({ values, onDiagnosisChange, diagnosisOptions, billingOptions = [], onServiceCodeChange, onInterpreterCodeChange, onBillingCodesChange, otherDiagnoses = [], onRemoveOtherDiagnosis, title = 'Diagnosis & Billing Codes', description, showBilling = true, disabled = false, children }: Props) {
  const usesCodeList = Boolean(onBillingCodesChange);
  const split = splitServiceCodes(values.billingCodes);
  const serviceCode = usesCodeList ? split.serviceCode : values.serviceCode || '';
  const interpreterCode = usesCodeList ? split.interpreterCode : values.interpreterCode || '';
  const setService = (value: string) => usesCodeList ? onBillingCodesChange!(mergeServiceCodes({ ...split, serviceCode: value })) : onServiceCodeChange?.(value);
  const setInterpreter = (value: string) => usesCodeList ? onBillingCodesChange!(mergeServiceCodes({ ...split, interpreterCode: value })) : onInterpreterCodeChange?.(value);
  return <section aria-label={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
    <div>
      <h5 className="text-base font-bold text-slate-800">{title}</h5>
      <p className="text-xs text-slate-600">{description || 'Type a few letters (e.g. "anx", "dep", "alc", "ptsd") or a code, then pick from the list. Only Diagnosis 1 is required.'}</p>
    </div>
    <div className="grid md:grid-cols-2 gap-3">
      {DIAGNOSIS_FIELDS.map((field, index) => <ClinicalCodeInput key={field} kind="diagnosis" disabled={disabled} fallback={diagnosisOptions} label={diagnosisLabels[index]} value={values[field] || ''} onChange={event => onDiagnosisChange(field, event.target.value)} placeholder={index === 0 ? 'e.g. anx, dep, F41.1' : 'Optional'} />)}
    </div>
    {otherDiagnoses.length > 0 && <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Other diagnoses on file</p>
      <div className="flex flex-wrap gap-2">{otherDiagnoses.map(entry => <span key={entry} className="inline-flex items-center gap-1 rounded-xl bg-white border px-2 py-1 text-xs">{entry}
        {onRemoveOtherDiagnosis && <button type="button" disabled={disabled} aria-label={`Remove ${entry}`} className="opacity-70 hover:opacity-100" onClick={() => onRemoveOtherDiagnosis(entry)}>×</button>}
      </span>)}</div>
    </div>}
    {showBilling && <div className="grid md:grid-cols-2 gap-3">
      <ClinicalCodeInput kind="billing" disabled={disabled} fallback={billingOptions} label="CPT / HCPCS service code" value={serviceCode} onChange={event => setService(event.target.value)} placeholder="e.g. 90791, 90837, therapy" />
      <ClinicalCodeInput kind="billing" disabled={disabled} fallback={billingOptions} label="Interpreter code (only if an interpreter was used)" value={interpreterCode} onChange={event => setInterpreter(event.target.value)} placeholder="e.g. T1013, interpreter" />
    </div>}
    {showBilling && usesCodeList && split.otherCodes.length > 0 && <div className="flex flex-wrap gap-2 text-xs">
      <span className="font-bold uppercase tracking-wider text-slate-600">Add-on codes on file:</span>
      {split.otherCodes.map(entry => <span key={entry} className="inline-flex items-center gap-1 rounded-xl bg-white border px-2 py-1">{entry}
        <button type="button" disabled={disabled} aria-label={`Remove ${entry}`} className="opacity-70 hover:opacity-100" onClick={() => onBillingCodesChange!(mergeServiceCodes({ ...split, otherCodes: split.otherCodes.filter(code => code !== entry) }))}>×</button>
      </span>)}
    </div>}
    {children}
  </section>;
}
