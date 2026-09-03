/** Never render service JSON or infer clinical findings from a microphone test. */
export function readableTranscript(value: unknown): string {
  if (typeof value === 'string') {
    const text = value.trim();
    if (/^[\[{]/.test(text)) { try { return readableTranscript(JSON.parse(text)); } catch { throw new Error('Transcript data could not be read. Retrieve the transcript again.'); } }
    if (!text) throw new Error('No speech was returned in the transcript. Check microphone input before recording again.');
    return text;
  }
  const data = value as any;
  const conversation = data?.Conversation || data;
  if (Array.isArray(conversation?.TranscriptSegments)) {
    const words = conversation.TranscriptSegments.map((segment: any) => typeof segment.Content === 'string' ? segment.Content.trim() : '').filter(Boolean).join('\n');
    if (words) return words;
  }
  if (Array.isArray(conversation?.TranscriptItems)) {
    const words = conversation.TranscriptItems.reduce((text: string, item: any) => {
      const word = item.Alternatives?.[0]?.Content;
      if (typeof word !== 'string' || !word.trim()) return text;
      return text + (text && item.Type !== 'PUNCTUATION' ? ' ' : '') + word;
    }, '');
    if (words.trim()) return words.trim();
  }
  const transcripts = data?.results?.transcripts;
  if (Array.isArray(transcripts)) return readableTranscript(transcripts.map((item: any) => item.transcript || '').join('\n').trim());
  throw new Error('No readable transcript was returned. No clinical draft was generated.');
}
export function isIntakeTemplate(template: string): boolean {
  return template === 'Biopsychosocial';
}
export function groundedDraft(transcript: string, template: string, supported: Record<string, string> = {}) {
  const clean = readableTranscript(transcript);
  const headings = isIntakeTemplate(template)
    ? ['Presenting problem', 'Biological / medical history', 'Psychological history', 'Social history', 'Treatment goals', 'Assessment', 'Plan']
    : template === 'Treatment Plan Update' ? ['Progress', 'Goals', 'Interventions', 'Plan']
    : template === 'Psychosocial' ? ['Current stressors', 'Social history', 'Strengths', 'Assessment', 'Plan']
    : ['Subjective', 'Objective', 'Assessment', 'Plan'];
  // Source words remain verbatim. Findings, diagnoses and interventions require provider input.
  const fields = Object.fromEntries(headings.map(heading => [heading, 'Not documented — complete from the reviewed session.']));
  for (const heading of headings) { if (supported[heading]) fields[heading] = supported[heading]; }
  if (isIntakeTemplate(template) && supported.Subjective) fields['Presenting problem'] = supported.Subjective;
  return { title: `${template} draft`, noteType: template, fields,
    content: `${template}\n\n${Object.entries(fields).map(([name, text]) => `${name}:\n${text}`).join('\n\n')}` };
}

/** Use traceable summaries only; audio cannot establish visual findings or a diagnosis. */
export function supportedClinicalSections(transcript: any, document: any): Record<string, string> {
  const segments = transcript?.Conversation?.TranscriptSegments || [];
  const evidence = new Map(segments.map((segment: any) => [segment.SegmentId, segment]));
  const sections = document?.ClinicalDocumentation?.Sections || [];
  const result: Record<string, string> = {};
  for (const section of sections) {
    const name = String(section.SectionName || '').toUpperCase();
    if (!['SUBJECTIVE', 'PLAN'].includes(name)) continue;
    const summaries = (section.Summary || []).filter((summary: any) => {
      const links = summary.EvidenceLinks || [];
      return typeof summary.SummarizedSegment === 'string' && links.length > 0 && links.every((link: any) => {
        const segment: any = evidence.get(link.SegmentId);
        return segment?.Content && segment?.SectionDetails?.SectionName !== 'SMALL_TALK';
      });
    }).map((summary: any) => summary.SummarizedSegment.trim());
    if (summaries.length) result[name === 'SUBJECTIVE' ? 'Subjective' : 'Plan'] = summaries.join('\n');
  }
  return result;
}

export function intakeFieldPatch(template: string, fields: Record<string, string>): Record<string, string> {
  if (!isIntakeTemplate(template)) return {};
  const mapping: Record<string, string> = {
    'Presenting problem': 'presentingProblem', 'Biological / medical history': 'medicalPhysicalHistory',
    'Psychological history': 'mentalHealthHistory', 'Social history': 'socialFamilyHistory',
    'Treatment goals': 'treatmentGoals', Assessment: 'clinicalFormulation',
  };
  return Object.fromEntries(Object.entries(mapping).filter(([label]) => fields[label]?.trim() && !fields[label].startsWith('Not documented')).map(([label, key]) => [key, fields[label]]));
}
