'use client';

import { useEffect, useRef, useState } from 'react';

type Option = { value: string; label: string };

export function SearchableSelect({
  id, value, onChange, options, required = false, locale = 'en',
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  locale?: 'ar' | 'en';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onOutside = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        id={id}
        type="button"
        className="input flex w-full items-center justify-between gap-3 text-start"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setQuery(''); setOpen((current) => !current); }}
      >
        <span className="truncate">{selected?.label ?? (locale === 'ar' ? 'اختر' : 'Select')}</span>
        <span aria-hidden="true" className="text-muted">⌄</span>
      </button>
      {required && <input type="text" tabIndex={-1} aria-hidden="true" required value={value} onChange={() => {}} className="pointer-events-none absolute h-0 w-0 opacity-0" />}
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/20 bg-[#171528] shadow-2xl">
          <div className="p-2">
            <input
              ref={search}
              type="search"
              className="input w-full"
              placeholder={locale === 'ar' ? 'ابحث هنا...' : 'Search options...'}
              aria-label={locale === 'ar' ? 'بحث في الخيارات' : 'Search options'}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && filtered.length > 0) {
                  event.preventDefault();
                  onChange(filtered[0]!.value);
                  setOpen(false);
                }
              }}
            />
          </div>
          <div role="listbox" aria-labelledby={id} className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted">{locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}</p>}
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-white/10 ${value === option.value ? 'bg-primary/20 text-ink' : 'text-muted'}`}
                onClick={() => { onChange(option.value); setOpen(false); setQuery(''); }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
