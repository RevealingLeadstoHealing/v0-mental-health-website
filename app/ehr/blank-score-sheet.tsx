'use client';
import React, { useState } from 'react';

// Universal clinician scoring sheet for ANY licensed/copyrighted instrument.
//
// This form deliberately contains NO instrument question text. The clinician
// administers the instrument from the official/licensed materials they own,
// then records the per-item scores here. The tool totals them and lets the
// clinician enter the interpretation band from the official manual.
//
// This protects the practice: the software does not reproduce copyrighted
// item wording, but the clinician can still score and document any instrument.

type ScoredItem = { id: number; score: string };

type Props = {
  initialItemScores?: string;
  onChange?: (result: { itemScores: string[]; total: number; count: number; scoredCount: number }) => void;
};

function itemsFromSaved(saved: string | undefined): ScoredItem[] {
  const scores = (saved || '').split(',').map((score) => score.trim());
  const length = saved?.trim() ? Math.min(100, scores.length) : 10;
  return Array.from({ length }, (_, i) => ({ id: i + 1, score: saved?.trim() ? scores[i] || '' : '' }));
}

function summarize(items: ScoredItem[]) {
  const entered = items.filter((it) => it.score.trim() !== '' && Number.isFinite(Number(it.score)));
  return {
    itemScores: items.map((it) => it.score.trim()),
    total: entered.reduce((sum, it) => sum + Number(it.score), 0),
    count: items.length,
    scoredCount: entered.length,
  };
}

export default function BlankScoreSheet({ initialItemScores, onChange }: Props) {
  const [items, setItems] = useState<ScoredItem[]>(() => itemsFromSaved(initialItemScores));
  const { total, count, scoredCount } = summarize(items);

  const update = (next: ScoredItem[]) => {
    setItems(next);
    onChange?.(summarize(next));
  };

  const setCountSafe = (n: number) => {
    const length = Math.max(1, Math.min(100, Math.floor(n) || 1));
    update(Array.from({ length }, (_, i) => ({ id: i + 1, score: items[i]?.score || '' })));
  };

  const setScore = (index: number, value: string) => {
    update(items.map((it, i) => (i === index ? { ...it, score: value } : it)));
  };

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Administer this instrument from your own licensed/official materials. This
        sheet records the per-item scores you obtain — it intentionally does not
        display the copyrighted questions. Enter each item&rsquo;s score, then record
        the interpretation from the official scoring manual below.
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Number of items on this instrument</span>
        <input
          type="number"
          min={1}
          max={100}
          className="w-32 rounded-xl border p-2"
          value={count}
          onChange={(e) => setCountSafe(Number(e.target.value))}
        />
      </label>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {items.map((it, index) => (
          <label key={it.id} className="text-sm">
            <span className="block text-xs text-slate-500">Item {it.id}</span>
            <input
              type="number"
              className="w-full rounded-lg border p-2"
              value={it.score}
              onChange={(e) => setScore(index, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="rounded-xl border bg-slate-50 p-3 text-sm">
        <span className="font-semibold">Calculated total:</span> {scoredCount ? total : '—'}
        {scoredCount < count && (
          <span className="ml-2 text-amber-700">({scoredCount} of {count} items scored)</span>
        )}
      </div>
    </div>
  );
}
