'use client';

import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/client-api';
import { favoriteGenresKey, normalizeFavoriteGenres } from '@/lib/favorite-genres';

type Genre = { id: string; nameEn: string; nameAr: string };
type Initial = { available: boolean; show: boolean; genreIds: string[]; genres: Genre[] };

export function FavoriteGenresSelector({
  userId,
  locale,
  mode = 'welcome',
}: {
  userId: string | null;
  locale: 'ar' | 'en';
  mode?: 'welcome' | 'settings';
}) {
  const ar = locale === 'ar';
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOpen(false);
    setAvailable(false);
    if (!userId) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const data = await apiRequest<Initial>('/api/onboarding/favorite-genres');
        if (cancelled) return;
        setAvailable(data.available);
        setGenres(data.genres);
        const availableIds = data.genres.map((g) => g.id);
        let ids = normalizeFavoriteGenres(data.genreIds, availableIds);
        if (!ids.length) {
          try {
            ids = normalizeFavoriteGenres(
              JSON.parse(window.localStorage.getItem(favoriteGenresKey(userId)) ?? '[]'),
              availableIds,
            );
          } catch { /* Device storage is optional. */ }
        }
        setSelected(ids);
        if (ids.length) {
          try {
            window.localStorage.setItem(favoriteGenresKey(userId), JSON.stringify(ids));
            window.dispatchEvent(new Event('oddio-favorite-genres-changed'));
          } catch { /* Account settings remain authoritative. */ }
        }
        setOpen(mode === 'welcome' && data.available && data.show && data.genres.length > 0);
      } catch {
        // Fail closed: don't show a recurring popup when account state can't be checked.
        if (!cancelled) setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, mode]);

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  const toggle = (id: string) => {
    setError('');
    setSelected((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : current.length < 3 ? [...current, id] : current);
  };

  async function finish(ids: string[]) {
    if (!userId || saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await apiRequest<{ saved: boolean }>('/api/onboarding/favorite-genres', {
        method: 'PUT',
        body: JSON.stringify({ genreIds: ids }),
      });
      if (!result.saved) throw new Error('Save unavailable');
      setSelected(ids);
      try {
        window.localStorage.setItem(favoriteGenresKey(userId), JSON.stringify(ids));
        window.dispatchEvent(new Event('oddio-favorite-genres-changed'));
      } catch { /* Cross-device account preference has been saved. */ }
      setOpen(false);
      setNotice(ar ? 'تم حفظ اختياراتك.' : 'Your preferences were saved.');
    } catch {
      setError(ar ? 'مقدرناش نحفظ اختياراتك. جرّب تاني.' : 'Could not save your choices. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!userId || loading || !available || (mode === 'welcome' && !open)) return null;

  const body = (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label={ar ? 'الأنواع الموسيقية المفضلة' : 'Favorite genres'}>
        {genres.map((genre) => {
          const active = selected.includes(genre.id);
          return (
            <button
              key={genre.id}
              type="button"
              aria-pressed={active}
              disabled={saving || (!active && selected.length >= 3)}
              onClick={() => toggle(genre.id)}
              className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-35 ${active ? 'border-primary bg-primary/20 text-primary' : 'border-white/20 bg-white/5 text-ink hover:bg-white/10'}`}
            >
              {ar ? genre.nameAr : genre.nameEn}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {selected.length}/3 {ar ? 'أنواع تم اختيارها' : 'genres selected'}
      </p>
      {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : null}
    </>
  );

  if (mode === 'settings') {
    return (
      <section className="card mt-6 max-w-3xl space-y-4 p-5" aria-label={ar ? 'الأنواع الموسيقية المفضلة' : 'Favorite genres'}>
        <h2 className="text-lg font-bold text-ink">{ar ? 'الأنواع الموسيقية المفضلة' : 'Favorite music genres'}</h2>
        <p className="text-sm text-muted">{ar ? 'ممكن تغيّر اختياراتك في أي وقت. اختار لحد 3 أنواع.' : 'Change your choices any time. Pick up to 3 genres.'}</p>
        {body}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={saving} onClick={() => void finish(selected)}
            className="min-h-11 rounded-full bg-primary px-6 text-sm font-bold text-black disabled:opacity-50">
            {saving ? (ar ? 'جاري الحفظ…' : 'Saving…') : (ar ? 'حفظ الاختيارات' : 'Save preferences')}
          </button>
          <button type="button" disabled={saving || !selected.length} onClick={() => void finish([])}
            className="min-h-11 rounded-full border border-white/20 px-5 text-sm text-ink disabled:opacity-50">
            {ar ? 'مسح الاختيارات' : 'Clear choices'}
          </button>
        </div>
        {notice ? <p role="status" className="text-sm text-emerald-400">{notice}</p> : null}
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="presentation">
      <section
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            void finish([]);
          }
          if (event.key !== 'Tab') return;
          const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
          if (!buttons.length) return;
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="oddio-genre-onboarding-title"
        aria-describedby="oddio-genre-onboarding-description"
        className="max-h-[90dvh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl border border-white/15 bg-[#18171e] p-5 shadow-2xl sm:p-8"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">ODDIO · {ar ? 'أهلاً بيك' : 'WELCOME'}</p>
        <h2 id="oddio-genre-onboarding-title" className="text-2xl font-black text-ink sm:text-3xl">
          {ar ? 'إيه الموسيقى اللي بتحب تسمعها؟' : 'What music do you love?'}
        </h2>
        <p id="oddio-genre-onboarding-description" className="text-sm leading-7 text-muted">
          {ar ? 'اختار لحد 3 أنواع عشان نبدأ نرشّحلك موسيقى تناسب ذوقك. الخطوة دي اختيارية وبتظهر مرة واحدة بس.' : 'Choose up to 3 genres to help us discover your sound. This optional step only appears once.'}
        </p>
        {body}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <button type="button" disabled={saving} onClick={() => void finish([])}
            className="min-h-11 rounded-full border border-white/20 px-5 text-sm font-semibold text-ink disabled:opacity-50">
            {ar ? 'تخطي دلوقتي' : 'Skip for now'}
          </button>
          <button type="button" disabled={saving} onClick={() => void finish(selected)}
            className="min-h-11 rounded-full bg-primary px-7 text-sm font-bold text-black disabled:opacity-50">
            {saving ? (ar ? 'جاري الحفظ…' : 'Saving…') : (ar ? 'يلا نكتشف الموسيقى' : 'Start listening')}
          </button>
        </div>
      </section>
    </div>
  );
}
