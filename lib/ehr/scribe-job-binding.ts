/** Resolve job ownership from the saved chart record, never a name prefix alone. */
export function resolveScribeJobBinding(record: any, practiceId: string, clientId: string, jobName: string) {
  if (!record || record.practiceId !== practiceId || record.clientId !== clientId ||
      record.recordType !== 'healthscribe-job' ||
      record.payload?.jobName !== jobName) return null;
  const mediaKey = record.payload?.mediaKey;
  if (typeof mediaKey !== 'string' || !mediaKey.startsWith(`temporary-audio/${practiceId}/${clientId}/`)) return null;
  return { jobName, mediaKey };
}
