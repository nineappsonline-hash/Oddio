'use client';

import { useMemo, useState } from 'react';
import { Play, Sparkles, SlidersHorizontal, WandSparkles } from 'lucide-react';
import type { CatalogTrack } from '@/lib/data/queries';
import { buildSoundspace, type DiscoveryLevel, type SoundspaceMood } from '@/lib/soundspace';
import { usePlayer } from '@/lib/player-store';
import { Artwork } from '@/components/ui/Artwork';
import { useLocale } from '@/i18n/use-translator';

const moods: Array<{ value: SoundspaceMood; en: string; ar: string }> = [
  { value: 'all', en: 'Everything', ar: 'كل الأغاني' },
  { value: 'calm', en: 'Unwind', ar: 'هدوء' },
  { value: 'energy', en: 'Energy', ar: 'حماس' },
  { value: 'night', en: 'After dark', ar: 'مزاج الليل' },
  { value: 'nostalgia', en: 'Nostalgia', ar: 'حنين' },
];
const levels: Array<{ value: DiscoveryLevel; en: string; ar: string }> = [
  { value: 'familiar', en: 'Familiar', ar: 'مألوف' },
  { value: 'balanced', en: 'Balanced', ar: 'متوازن' },
  { value: 'surprise', en: 'Surprise me', ar: 'فاجئني' },
];
const whyText: Record<'mood' | 'popular' | 'new' | 'explore', { en: string; ar: string }> = {
  mood: { en: 'Matches this mood', ar: 'مناسبة للمزاج ده' },
  popular: { en: 'Popular with listeners', ar: 'من الأغاني الأكثر سماعًا' },
  new: { en: 'Fresh or well-loved', ar: 'جديدة أو محبوبة' },
  explore: { en: 'A less-played discovery', ar: 'اكتشاف أقل انتشارًا' },
};

export function SoundspaceStudio({ tracks }: { tracks: CatalogTrack[] }) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const [mood, setMood] = useState<SoundspaceMood>('all');
  const [discovery, setDiscovery] = useState<DiscoveryLevel>('balanced');
  const [focusMode, setFocusMode] = useState(false);
  const play = usePlayer((state) => state.play);
  const picks = useMemo(() => buildSoundspace(tracks, mood, discovery), [tracks, mood, discovery]);
  const queue = picks.map((entry) => entry.track);
  return (
    <section aria-labelledby="soundspace-title" className="space-y-7">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#EAB997]/20 bg-[radial-gradient(circle_at_80%_15%,#60313d66,transparent_52%),linear-gradient(140deg,#27171c,#151014)] p-6 sm:p-10">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary"><Sparkles className="h-4 w-4" /> ODDIO SOUNDSCAPE</p>
        <h1 id="soundspace-title" className="mt-4 max-w-xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">{ar ? 'اسمع على مزاجك.' : 'A listening space, made yours.'}</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted">{ar ? 'اختار المود وحدد تحب تسمع المألوف ولا تكتشف صوت جديد. كل اختيار ليه سبب واضح.' : 'Choose your mood, then decide how adventurous your next listen should be. Every recommendation has a reason.'}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{ar ? 'التحكم في تجربتك' : 'Make this space yours'}</h2>
        <button type="button" aria-pressed={focusMode} onClick={() => setFocusMode((value) => !value)}
          className="inline-flex min-h-11 items-center rounded-full border border-primary/40 px-4 text-sm font-semibold text-primary transition hover:bg-primary/10">
          {focusMode ? (ar ? 'إظهار الاختيارات' : 'Show controls') : (ar ? 'وضع الاستماع الهادئ' : 'Distraction-free mode')}
        </button>
      </div>
      {!focusMode ? <div className="card space-y-6 p-5 sm:p-7">
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><WandSparkles className="h-4 w-4 text-primary" />{ar ? 'المود دلوقتي' : 'Your mood right now'}</legend>
          <div className="flex flex-wrap gap-2">
            {moods.map((entry) => (
              <button key={entry.value} type="button" aria-pressed={mood === entry.value}
                onClick={() => setMood(entry.value)}
                className={`min-h-11 rounded-full border px-4 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${mood === entry.value ? 'border-primary bg-primary/15 text-ink' : 'border-white/15 text-muted hover:border-primary/40 hover:text-ink'}`}>
                {ar ? entry.ar : entry.en}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><SlidersHorizontal className="h-4 w-4 text-primary" />{ar ? 'قد إيه تحب تكتشف؟' : 'Your discovery dial'}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {levels.map((entry) => (
              <button key={entry.value} type="button" aria-pressed={discovery === entry.value}
                onClick={() => setDiscovery(entry.value)}
                className={`min-h-12 rounded-xl border px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${discovery === entry.value ? 'border-primary bg-primary/15 text-ink' : 'border-white/15 text-muted hover:border-primary/40 hover:text-ink'}`}>
                {ar ? entry.ar : entry.en}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <p aria-live="polite" className="text-sm text-muted">{ar ? `${picks.length} أغنية للاختيار الحالي` : `${picks.length} tracks for this selection`}</p>
          {queue.length > 0 ? (
            <button type="button" onClick={() => play(queue[0]!, queue.slice(1))}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-[#211518] transition hover:bg-primary-strong">
              <Play className="h-4 w-4" fill="currentColor" /> {ar ? 'شغّل الميكس' : 'Play this mix'}
            </button>
          ) : null}
        </div>
      </div> : (
        <div className="card flex items-center justify-between gap-3 p-5">
          <p className="text-sm text-muted">{ar ? 'المود والاختيارات محفوظين لحد ما ترجع للوضع العادي.' : 'Your mood and discovery settings are preserved.'}</p>
          {queue[0] ? <button type="button" onClick={() => play(queue[0]!, queue.slice(1))} className="min-h-11 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-[#211518]">{ar ? 'تشغيل' : 'Play'}</button> : null}
        </div>
      )}

      {!focusMode && picks.length ? (
        <ol className="grid gap-3 md:grid-cols-2">
          {picks.map(({ track, why }, index) => (
            <li key={track.id} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-surface p-3 transition hover:border-primary/30">
              <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted">{index + 1}</span>
              <Artwork title={track.title} url={track.artwork.url} accent={track.artwork.accent} className="h-14 w-14 shrink-0" rounded="rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{track.title}</p>
                <p className="truncate text-xs text-muted">{track.artist?.name ?? 'Oddio'}</p>
                <p className="mt-1 text-xs text-primary">{ar ? whyText[why].ar : whyText[why].en}</p>
              </div>
              <button type="button" aria-label={ar ? `شغّل ${track.title}` : `Play ${track.title}`}
                onClick={() => play(track, queue.slice(index + 1))}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary hover:bg-primary/15">
                <Play className="h-4 w-4" fill="currentColor" />
              </button>
            </li>
          ))}
        </ol>
      ) : !focusMode ? (
        <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center">
          <p className="text-sm text-muted">{ar ? 'لسه مفيش أغاني مناسبة للمود ده. جرّب مود تاني.' : 'No tracks match this mood yet. Try a different mood.'}</p>
          <button type="button" onClick={() => setMood('all')} className="mt-3 min-h-11 rounded-full px-4 text-sm font-semibold text-primary underline">{ar ? 'كل الأغاني' : 'Show everything'}</button>
        </div>
      ) : (
        <div className="card flex min-h-44 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-semibold text-ink">{ar ? 'الموسيقى وبس.' : 'Just the music.'}</p>
          <p className="max-w-md text-sm leading-6 text-muted">{ar ? 'الاختيارات مخفية مؤقتًا. المشغل هيفضل متاح تحت، وتقدر ترجع للتحكم في أي وقت.' : 'The recommendations are hidden for now. Your persistent player remains available, and you can reopen controls anytime.'}</p>
          {queue[0] ? <button type="button" onClick={() => play(queue[0]!, queue.slice(1))} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-[#211518]"><Play className="h-4 w-4" fill="currentColor" />{ar ? 'شغّل الميكس' : 'Play this mix'}</button> : null}
        </div>
      )}
      <p className="text-xs leading-6 text-muted">{ar ? 'الاختيارات مبنية على مود الأغنية، تاريخ إصدارها وعدد مرات تشغيلها. مش بنستخدم بيانات شخصية أو ندّعي إنها توصيات ذكاء اصطناعي متدربة عليك.' : 'Selections use public track moods, release dates and play counts. This is an explainable mix, not an AI model trained on your private listening history.'}</p>
    </section>
  );
}
