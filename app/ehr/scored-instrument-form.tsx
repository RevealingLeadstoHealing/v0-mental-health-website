'use client';
import React, { useMemo, useState } from 'react';
import { scoredInstruments, scoreInstrument } from '../../lib/ehr/scored-instruments';

// Renders a public-domain scored screener with its actual question text and
// selectable response options, then auto-scores. Clinician selects each
// response (radio buttons) instead of free-typing.

type Props = {
  instrumentKey: string;
  initialAnswers?: Record<string, number>;
  onAnswersChange?: (result: { answers: Record<string, number>; total: number; band: string; answeredAll: boolean }) => void;
};

export default function ScoredInstrumentForm({ instrumentKey, initialAnswers, onAnswersChange }: Props) {
  const instrument = scoredInstruments[instrumentKey];
  const [answers, setAnswers] = useState<Record<string, number>>(() => initialAnswers || {});

  const result = useMemo(() => scoreInstrument(instrumentKey, answers), [instrumentKey, answers]);

  if (!instrument) return null;

  const select = (itemId: string, value: number) => {
    const next = { ...answers, [itemId]: value };
    setAnswers(next);
    const scored = scoreInstrument(instrumentKey, next);
    if (onAnswersChange && scored) {
      onAnswersChange({ answers: next, total: scored.total, band: scored.band, answeredAll: scored.answeredAll });
    }
  };

  const flagValue = instrument.flagItemId ? answers[instrument.flagItemId] : undefined;
  const flagRaised =
    instrument.flagItemId && typeof flagValue === 'number' && flagValue > 0;

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <div>
        <h3 className="text-xl font-semibold">{instrument.title}</h3>
        <p className="text-sm text-slate-600">{instrument.instructions}</p>
        <p className="mt-1 text-xs text-slate-500">{instrument.publicDomainNote}</p>
      </div>

      <ol className="space-y-4">
        {instrument.items.map((item, index) => (
          <li key={item.id} className="rounded-xl border p-3">
            <p className="text-sm font-medium">
              {index + 1}. {item.text}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {instrument.options.map((opt) => {
                const checked = answers[item.id] === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={
                      'cursor-pointer rounded-lg border px-3 py-1.5 text-sm ' +
                      (checked ? 'border-blue-600 bg-blue-50 font-semibold' : 'border-slate-300')
                    }
                  >
                    <input
                      type="radio"
                      name={item.id}
                      className="sr-only"
                      checked={checked}
                      onChange={() => select(item.id, opt.value)}
                    />
                    {opt.label}
                    <span className="ml-1 text-xs text-slate-400">({opt.value})</span>
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {result && (
        <div className="rounded-xl border bg-slate-50 p-3 text-sm">
          <p>
            <span className="font-semibold">Total score:</span> {result.total} / {result.maxScore}
            {!result.answeredAll && (
              <span className="ml-2 text-amber-700">(not all items answered)</span>
            )}
          </p>
          {result.band && (
            <p>
              <span className="font-semibold">Severity band:</span> {result.band}
            </p>
          )}
        </div>
      )}

      {flagRaised && instrument.flagNote && (
        <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
          ⚠ {instrument.flagNote}
        </p>
      )}
    </div>
  );
}
