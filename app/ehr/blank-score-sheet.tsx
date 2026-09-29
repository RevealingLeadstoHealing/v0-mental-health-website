'use client';
'use client';
import React, { useMemo, useState } from 'react';

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
  onChange?: (result: { itemScores: number[]; total: number; count: number }) => void;
};

export default function BlankScoreSheet({ onChange }: Props) {
  const [count, setCount] = useState(10);
  const [items, setItems] = useState<ScoredItem[]>(() =>
    Array.from({ length: 10 }, (_, i) => ({ id: i + 1, score: '' }))
  );

  const total = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.score) || 0), 0),
    [items]
  );

  const setCountSafe = (n: number) => {
    const next = Math.max(1, Math.min(100, Math.floor(n) || 1));
    setCount(next);
    setItems((prev) => {
      const arr = Array.from({ length: next }, (_, i) => prev[i] || { id: i + 1, score: '' });
      return arr.map((it, i) => ({ ...it, id: i + 1 }));
    });
  };

  const setScore = (index: number, value: string) => {
    setItems((prev) => {
      const next = prev.map((it, i) => (i === index ? { ...it, score: value } : it));
      const t = next.reduce((sum, it) => sum + (Number(it.score) || 0), 0);
      if (onChange) {
        onChange({
          itemScores: next.map((it) => Number(it.score) || 0),
          total: t,
          count: next.length,
        });
      }
      return next;
    });
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
        <span className="font-semibold">Calculated total:</span> {total}
      </div>
    </div>
  );
}
