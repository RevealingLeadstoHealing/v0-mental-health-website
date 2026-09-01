export const specialtyAssessments = [
  { key: 'familyReview', label: 'Family Dynamics — Clinical Assessment', group: 'Families', version: 'Clinical interview' },
  { key: 'familyApgar', label: 'Family APGAR', group: 'Families', version: '' },
  { key: 'fad', label: 'McMaster Family Assessment Device (FAD)', group: 'Families', version: '' },
  { key: 'couplesReview', label: 'Couples / Relationship — Clinical Assessment', group: 'Couples & relationships', version: 'Clinical interview' },
  { key: 'csi', label: 'Couples Satisfaction Index (CSI)', group: 'Couples & relationships', version: '' },
  { key: 'rdas', label: 'Revised Dyadic Adjustment Scale (RDAS)', group: 'Couples & relationships', version: '' },
  { key: 'perinatalReview', label: 'Perinatal / Postpartum — Clinical Assessment', group: 'Pregnancy & postpartum', version: 'Clinical interview' },
  { key: 'epds', label: 'Edinburgh Postnatal Depression Scale (EPDS)', group: 'Pregnancy & postpartum', version: '' },
  { key: 'pass', label: 'Perinatal Anxiety Screening Scale (PASS)', group: 'Pregnancy & postpartum', version: '' },
  { key: 'cooccurringReview', label: 'Dual Diagnosis / Co-occurring Disorders — Clinical Assessment', group: 'Co-occurring disorders', version: 'Clinical interview' },
  { key: 'assist', label: 'WHO ASSIST', group: 'Co-occurring disorders', version: '' },
  { key: 'mhsf3', label: 'Mental Health Screening Form III (MHSF-III)', group: 'Co-occurring disorders', version: '' },
  { key: 'vanderbilt', label: 'Vanderbilt ADHD Rating Scales', group: 'Child & adolescent', version: '' },
  { key: 'mchat', label: 'M-CHAT-R/F', group: 'Development & autism', version: '' },
  { key: 'aq10', label: 'Autism Spectrum Quotient (AQ-10)', group: 'Development & autism', version: '' },
  { key: 'gds', label: 'Geriatric Depression Scale (GDS)', group: 'Older adults & caregivers', version: '' },
  { key: 'zarit', label: 'Zarit Burden Interview', group: 'Older adults & caregivers', version: '' },
  { key: 'mdq', label: 'Mood Disorder Questionnaire (MDQ)', group: 'Mood & anxiety', version: '' },
  { key: 'ocir', label: 'Obsessive-Compulsive Inventory–Revised (OCI-R)', group: 'Mood & anxiety', version: '' },
  { key: 'isi', label: 'Insomnia Severity Index (ISI)', group: 'Sleep', version: '' },
  { key: 'pg13r', label: 'Prolonged Grief Disorder–13–Revised (PG-13-R)', group: 'Grief', version: '' },
  { key: 'whodas', label: 'WHODAS 2.0', group: 'Functioning & disability', version: '' },
  { key: 'mse', label: 'Mental Status Exam (MSE)', group: 'Mental health', version: 'Clinical MSE' },
  { key: 'audit', label: 'AUDIT', group: 'Addiction & substance use', version: 'AUDIT — 10 items' },
  { key: 'cageAid', label: 'CAGE-AID', group: 'Addiction & substance use', version: 'CAGE-AID — 4 items' },
  { key: 'psc', label: 'Pediatric Symptom Checklist (PSC)', group: 'Child & adolescent', version: '' },
  { key: 'scared', label: 'SCARED', group: 'Child & adolescent', version: '' },
  { key: 'asq', label: 'Ages & Stages Questionnaires (ASQ)', group: 'Child & adolescent', version: '' },
  { key: 'mmse', label: 'Mini-Mental State Examination (MMSE)', group: 'Cognition & attention', version: '' },
  { key: 'moca', label: 'Montreal Cognitive Assessment (MoCA)', group: 'Cognition & attention', version: '' },
  { key: 'asrs', label: 'Adult ADHD Self-Report Scale (ASRS)', group: 'Cognition & attention', version: '' },
  { key: 'pcl5', label: 'PCL-5', group: 'Trauma & stress', version: 'PCL-5' },
  { key: 'tec', label: 'Trauma Experiences Checklist (TEC)', group: 'Trauma & stress', version: '' },
  { key: 'scoff', label: 'SCOFF', group: 'Eating & body image', version: 'SCOFF — 5 items' },
  { key: 'eat26', label: 'Eating Attitudes Test (EAT-26)', group: 'Eating & body image', version: 'EAT-26' },
] as const;
export const mseDomains = [
  'Appearance and grooming', 'Behavior and engagement', 'Psychomotor activity',
  'Speech', 'Mood (client report)', 'Affect (observed)', 'Thought process',
  'Thought content', 'Perception', 'Orientation', 'Attention and concentration',
  'Memory', 'Insight', 'Judgment', 'Safety: suicidal and homicidal thoughts',
] as const;
export const clinicalDomains: Record<string, readonly string[]> = {
  mse: mseDomains,
  familyReview: ['Participants and relationships', 'Presenting concerns and each participant’s perspective', 'Family structure, caregiving and roles', 'Communication and conflict patterns', 'Boundaries and decision-making', 'Culture, stressors and major transitions', 'Strengths and supports', 'Safety, coercion, abuse and safeguarding', 'Shared and individual goals'],
  couplesReview: ['Participants and relationship context', 'Each partner’s concerns and goals', 'Communication and conflict repair', 'Trust, attachment and emotional connection', 'Intimacy and boundaries', 'Parenting, finances and shared responsibilities', 'Strengths and supports', 'Private safety screening, coercion and suitability for conjoint sessions', 'Consent and confidentiality expectations'],
  perinatalReview: ['Pregnancy or postpartum stage and relevant dates', 'Mood and anxiety symptoms, onset and duration', 'Sleep, appetite and functioning', 'Bonding, caregiving and available support', 'Birth experiences, losses and medical concerns', 'Past mood episodes, mania or psychosis', 'Intrusive thoughts, intent and safety of parent and infant', 'Medication, substance use and care coordination', 'Protective factors and urgent care needs'],
  cooccurringReview: ['Mental health symptoms and functional impact', 'Substances, amount, route, frequency and last use', 'Symptom timeline relative to substance use and abstinence', 'Withdrawal, overdose and urgent medical concerns', 'Past treatment and recovery history', 'Medication and other medical conditions', 'Readiness, strengths and recovery supports', 'Suicide, violence and safeguarding concerns', 'Integrated care and coordination needs'],
};
export function validateSpecialtyAssessment(key: string, data: Record<string, string>) {
  if (!specialtyAssessments.some(item => item.key === key)) return 'Select an assessment.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.administrationDate || '') || !Number.isFinite(Date.parse(data.administrationDate))) return 'Enter the administration date.';
  if (!data.examiner?.trim()) return 'Enter the examiner name.';
  if (!data.interpretation?.trim() || !data.followUp?.trim()) return 'Enter the clinical interpretation and follow-up plan.';
  if (clinicalDomains[key]) {
    if (clinicalDomains[key].some(domain => !data[domain]?.trim())) return 'Document each clinical area, or enter “Not assessed” with a reason.';
  } else if (!data.version?.trim() || !data.respondent?.trim() || !data.results?.trim() || !data.source?.trim()) {
    return 'Enter the exact form/version, respondent, results, and source record.';
  }
  return '';
}
