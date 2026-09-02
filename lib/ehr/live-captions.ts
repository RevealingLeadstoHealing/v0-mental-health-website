export type CaptionLine = { id: string; speaker: string; text: string; partial: boolean; start: number };
type CaptionResult = {
  resultId: string; isPartial: boolean; startTimeMs: number;
  alternatives: { transcript: string; items?: { attendee?: { attendeeId?: string } }[] }[];
};

// Replace partial results by ID; never append repeated interim words to the chart.
export function updateLiveCaptions(current: CaptionLine[], results: CaptionResult[], self: string): CaptionLine[] {
  const lines = new Map(current.map(line => [line.id, line]));
  for (const result of results) {
    const alternative = result.alternatives?.[0];
    if (!result.resultId || !alternative?.transcript?.trim()) continue;
    if (lines.get(result.resultId)?.partial === false && result.isPartial) continue;
    const attendee = alternative.items?.find(item => item.attendee?.attendeeId)?.attendee?.attendeeId;
    lines.set(result.resultId, {
      id: result.resultId, speaker: attendee ? (attendee === self ? 'You' : 'Other participant') : 'Speaker',
      text: alternative.transcript, partial: result.isPartial, start: result.startTimeMs,
    });
  }
  return [...lines.values()].sort((a, b) => a.start - b.start).slice(-100);
}
