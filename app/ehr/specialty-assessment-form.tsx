'use client';
import React, { useState } from 'react';
import { specialtyAssessments, clinicalDomains, validateSpecialtyAssessment } from '../../lib/ehr/specialty-assessments';

type Props = { assessmentKey: string; saved?: any; examiner: string; onSave: (key: string, payload: any, label: string) => Promise<void>; onBusy: (busy: boolean) => void };
export default function SpecialtyAssessmentForm({ assessmentKey, saved, examiner, onSave, onBusy }: Props) {
  const definition = specialtyAssessments.find(item => item.key === assessmentKey)!;
  const domains = clinicalDomains[assessmentKey];
  const [data, setData] = useState<Record<string, string>>(() => ({ administrationDate: '', examiner, administeredBy: 'Primary clinician', referralStatus: '', version: definition.version, ...saved?.data }));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const field = (key: string, label: string, multiline = false, placeholder = '') => <label key={key} className="block space-y-1 text-sm">
    <span className="font-medium">{label}</span>
    {multiline ? <textarea className="w-full rounded-xl border p-3 min-h-[85px]" value={data[key] || ''} placeholder={placeholder} onChange={e => setData(previous => ({ ...previous, [key]: e.target.value }))} /> :
      <input className="w-full rounded-xl border p-3" type={key === 'administrationDate' ? 'date' : 'text'} value={data[key] || ''} placeholder={placeholder} onChange={e => setData(previous => ({ ...previous, [key]: e.target.value }))} />}
  </label>;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const error = validateSpecialtyAssessment(assessmentKey, data);
    if (error) { setNotice(error); return; }
    setBusy(true); onBusy(true); setNotice('Saving…');
    try {
      await onSave(assessmentKey, { data: { ...data }, ...(data.totalScore?.trim() ? { score: Number(data.totalScore) } : {}), administrationMode: domains ? 'Clinical examination' : 'Official-form result entry' }, definition.label);
      setNotice('Saved to this client’s assessments.');
    } catch { setNotice('Save could not be confirmed. Your entries are still here; retry saving.'); }
    finally { setBusy(false); onBusy(false); }
  };
  return <form onSubmit={save} className="rounded-2xl border bg-white p-5 space-y-4">
    <h3 className="text-xl font-semibold">{definition.label}</h3>
    <p className="text-sm text-slate-600">{domains ? 'Document the clinical interview or examination you performed. No findings are selected automatically. This clinical template has no standardized score.' : 'Record results from the official administered form. This entry does not contain the questionnaire or calculate its score. Identify the exact edition, language, age-specific form, and respondent before interpreting results.'}</p>
    {assessmentKey === 'mse' && <p className="text-sm">MSE is a clinical examination, separate from MMSE cognitive screening.</p>}
    {['epds', 'pass', 'perinatalReview'].includes(assessmentKey) && <p className="text-sm">Document safety concerns and disposition regardless of the total score. Suspected psychosis, mania, or imminent danger to parent or infant requires urgent clinical evaluation.</p>}
    {assessmentKey === 'bodyImageReview' && <p className="text-sm">Record the client’s own meaning of body-image distress; this entry does not assign a body dysmorphic disorder diagnosis.</p>}
    {assessmentKey === 'sexualHealthReview' && <p className="text-sm">Assess distress, impairment, consent, and possible medical contributors. Sexual orientation, gender identity, and consensual preferences are not disorders.</p>}
    {['eatingReview', 'sexualHealthReview'].includes(assessmentKey) && <p className="text-sm">Document medical evaluation or referral when indicated; this interview does not replace a physical examination.</p>}
    {definition.group === 'Development & autism' && <p className="text-sm">Record the applicable age-specific form, informants, and support needs. Document an earlier Asperger’s diagnosis in the history when relevant; a screening score does not determine an autism diagnosis or support level.</p>}
    {assessmentKey === 'abaReview' && <p className="text-sm">Record naturally occurring observations. A functional hypothesis is not a confirmed cause; this form does not direct an experimental functional analysis.</p>}
    {!domains && <p className="text-sm">Use the official materials and the publisher’s administration, qualification, and scoring requirements. Record outside specialist results with the examiner and source identified.</p>}
    {definition.group === 'Identity & affirming support' && <p className="text-sm">Identity and orientation are not disorders. Use the client’s own language and record “Declined” or “Not discussed” when appropriate. Assess distress and support needs without inferring a diagnosis from identity. Gender dysphoria is distinct from body dysmorphic disorder.</p>}
    {assessmentKey === 'cognitiveReview' && <p className="text-sm">A screening result alone does not diagnose dementia. Sudden or fluctuating confusion or new neurological symptoms require prompt medical evaluation.</p>}
    {assessmentKey === 'asq' && <p className="text-sm">Specify ASQ-3 or ASQ:SE-2, the age interval, and domain results. This is Ages & Stages, not the Ask Suicide-Screening Questions tool.</p>}
    {assessmentKey === 'tec' && <p className="text-sm">Specify the full instrument title and author/version used; trauma exposure alone does not establish a diagnosis.</p>}
    <fieldset disabled={busy} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">{field('administrationDate', 'Administration date')}{field('examiner', 'Examiner')}{field('setting', 'Setting / telehealth and examination limitations')}{field('ageAtAssessment', 'Age at assessment / developmental context')}</div>
      <label className="block space-y-1 text-sm"><span className="font-medium">Administered by</span><select className="w-full rounded-xl border p-3" value={data.administeredBy || 'Primary clinician'} onChange={event => setData(previous => ({ ...previous, administeredBy: event.target.value }))}><option>Primary clinician</option><option>Other clinician / outside evaluator</option></select></label>
      {domains ? <div className="grid md:grid-cols-2 gap-4">{domains.map(domain => field(domain, domain, true, 'Observed finding, client report, or not assessed and reason'))}</div> : <>
        <div className="grid md:grid-cols-2 gap-4">{field('version', 'Exact instrument / edition / language / age interval')}{field('respondent', 'Respondent and relationship to client')}</div>
        {field('source', 'Source form / document reference', false, 'Reference to the completed form in the client chart')}
        {field('totalScore', 'Total score, if applicable', false, 'Leave blank for tools without a total score')}
        {field('results', 'Scoring method, subscales, and results', true, 'Record the official scoring method, applicable norms, subscale results, and any scoring limitations')}
      </>}
      {field('interpretation', 'Clinical interpretation / summary', true)}
      <label className="block space-y-1 text-sm"><span className="font-medium">Further evaluation / referral decision</span><select className="w-full rounded-xl border p-3" value={data.referralStatus || ''} onChange={event => setData(previous => ({ ...previous, referralStatus: event.target.value }))}><option value="">Select a decision</option><option>No referral indicated at this time</option><option>Further evaluation by primary clinician</option><option>Referral recommended</option><option>Referral placed</option><option>Awaiting specialist evaluation</option><option>Specialist evaluation completed</option><option>Client declined referral</option><option>Urgent evaluation arranged</option></select></label>
      {field('referralDestination', 'Referral destination / specialist, if applicable')}
      {field('referralReason', 'Reason for referral / additional evaluation, if applicable', true)}
      {field('followUp',  'Follow-up / disposition', true)}
      <button type="submit" className="rounded-xl bg-blue-600 text-white px-4 py-2 disabled:opacity-50">{busy ? 'Saving…' : `Save ${definition.label}`}</button>
    </fieldset>
    <p role="status" className="text-sm">{notice}</p>
    {saved?.completedAt && <p className="text-xs text-slate-500">Last recorded completion: {saved.completedAt}. Earlier completions remain in assessment history.</p>}
  </form>;
}
