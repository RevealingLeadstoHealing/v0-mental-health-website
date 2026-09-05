"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { indexCodes, searchCodes, type ClinicalCode } from '../../lib/ehr/code-search';

type Catalog = { version: string; effectiveThrough?: string; codes: ReturnType<typeof indexCodes> };
const catalogs = new Map<string, Promise<Catalog>>();
function loadCatalog(kind: string, fallback: ClinicalCode[]) {
  if (!catalogs.has(kind)) {
    const path = kind === 'diagnosis' ? '/ehr-codes/icd10cm-2026-04.json' : '/ehr-codes/hcpcs-2026-07.json';
    const promise = fetch(path).then(async response => {
      if (!response.ok) throw new Error('Code catalog could not be loaded.');
      const data = await response.json();
      const rows: ClinicalCode[] = data.codes.map(([code, label]: string[]) => ({ code, label, type: kind === 'billing' ? 'HCPCS' : 'ICD-10-CM' }));
      const merged = new Map(rows.map(row => [row.code, row]));
      for (const row of fallback) {
        const official = merged.get(row.code);
        if (official) merged.set(row.code, { ...official, keywords: `${row.label} ${row.keywords || ''}` });
        else if (kind === 'billing' && row.type === 'CPT') merged.set(row.code, row);
      }
      return { version: data.version, effectiveThrough: data.effectiveThrough, codes: indexCodes([...merged.values()]) };
    }).catch(error => { catalogs.delete(kind); throw error; });
    catalogs.set(kind, promise);
  }
  return catalogs.get(kind)!;
}

type Props = {
  kind: 'diagnosis' | 'billing'; label?: string; value?: string; placeholder?: string;
  fallback?: ClinicalCode[]; onChange?: (event: { target: { value: string } }) => void;
  onSelect?: (item: ClinicalCode) => void; className?: string; multiple?: boolean;
  searchOnly?: boolean; disabled?: boolean;
};
export default function ClinicalCodeInput({ kind, label, value = '', placeholder, fallback = [], onChange, onSelect, className = '', multiple = false, searchOnly = false, disabled = false }: Props) {
  const id = useId(); const [query, setQuery] = useState(value); const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null); const [error, setError] = useState('');
  const [active, setActive] = useState(-1); const [limit, setLimit] = useState(50);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setQuery(value); setOpen(false); }, [value]);
  useEffect(() => {
    if (!open || catalog) return;
    let cancelled = false;
    setError('');
    loadCatalog(kind, fallback).then(data => { if (!cancelled) setCatalog(data); }).catch(() => {
      if (!cancelled) setError('The complete catalog could not load. Close and reopen this field to retry.');
    });
    return () => { cancelled = true; };
  }, [open, kind, catalog]);
  const indexedFallback = useMemo(() => indexCodes(fallback), [fallback]);
  const results = useMemo(() => searchCodes(catalog?.codes || indexedFallback, query.split('|')[0], limit), [catalog, indexedFallback, query, limit]);
  function choose(item: ClinicalCode) {
    const selected = `${item.code} | ${item.label}`;
    onSelect?.(item);
    onChange?.({ target: { value: multiple ? [...new Set([...value.split(',').map(s => s.trim()).filter(Boolean), item.code])].join(', ') : selected } });
    setQuery(searchOnly ? '' : multiple ? [...new Set([...value.split(',').map(s => s.trim()).filter(Boolean), item.code])].join(', ') : selected);
    setOpen(false); setActive(-1); input.current?.focus();
  }
  return <div className="w-full space-y-1">
    {label && <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</label>}
    <input ref={input} id={id} role="combobox" aria-label={label || placeholder || `${kind} code search`} aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
      className={`w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 ${className}`}
      disabled={disabled} autoComplete="off" value={query} placeholder={placeholder || 'Type a code or a few letters'}
      onFocus={() => setOpen(true)} onBlur={event => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) setOpen(false); }}
      onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); setLimit(50); }}
      onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); setQuery(value); }
        if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(n => Math.min(n + 1, results.matches.length - 1)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive(n => Math.max(n - 1, 0)); }
        if (event.key === 'Enter' && open && active >= 0 && results.matches[active]) { event.preventDefault(); choose(results.matches[active]); }
      }} />
    {open && <div className="rounded-xl border border-stone-300 bg-white p-2 space-y-2">
      <p role="status" className="text-xs text-slate-600">{error || (!catalog ? 'Loading complete catalog…' : !query ? 'Type a diagnosis, service, abbreviation, or code.' : `${results.total} matches. Select the applicable code.`)}</p>
      <div id={`${id}-list`} role="listbox" aria-label={`${label || kind} matches`} className="overflow-auto" style={{ maxHeight: 240 }}>
        {results.matches.map((item, index) => <button key={item.code} id={`${id}-${index}`} type="button" role="option" aria-selected={active === index}
          className={`block w-full rounded-lg p-2 text-left text-sm ${active === index ? 'bg-blue-100' : 'hover:bg-slate-50'}`}
          onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}>{item.code} · {item.label}</button>)}
      </div>
      {results.total > limit && <button type="button" className="text-sm underline" onMouseDown={event => event.preventDefault()} onClick={() => setLimit(n => n + 50)}>Show 50 more matches</button>}
      {catalog && <p className="text-xs text-slate-500">{catalog.version}{kind === 'billing' ? ' + existing CPT list' : ''}{catalog.effectiveThrough ? ` · through ${catalog.effectiveThrough}` : ''}</p>}
    </div>}
    {!searchOnly && value && <button type="button" className="text-xs underline" disabled={disabled} onClick={() => { onChange?.({ target: { value: '' } }); setQuery(''); }}>Clear selection</button>}
  </div>;
}
