'use client';

import { useT } from '@/i18n/use-translator';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Artist, Genre, Locale, Mood } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { FileDropzone } from '@/components/ui/FileDropzone';

export function UploadForm({
  artists,
  albums,
  genres,
  moods,
  quotaRemaining,
  locale,
  production = false,
}: {
  artists: Artist[];
  albums: Array<{ id: string; artistId: string; title: string }>;
  genres: Genre[];
  moods: Mood[];
  quotaRemaining: number;
  locale: Locale;
  production?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [artistId, setArtistId] = useState(artists[0]?.id ?? '');
  const [albumId, setAlbumId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genreId, setGenreId] = useState(genres[0]?.id ?? '');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [languageCode, setLanguageCode] = useState('ar');
  const [countryCode, setCountryCode] = useState('');
  const [productionType, setProductionType] = useState<'fully_ai' | 'ai_assisted'>(
    'fully_ai',
  );
  const [aiTools, setAiTools] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [credits, setCredits] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>(
    'public',
  );
  const [releaseAt, setReleaseAt] = useState('');
  const [artworkAccent, setArtworkAccent] = useState('#9D5CFF');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, setPending] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [voiceConfirmed, setVoiceConfirmed] = useState(false);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  useEffect(() => { if (!audioFile) { setAudioPreviewUrl(null); return; } const url = URL.createObjectURL(audioFile); setAudioPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [audioFile]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!artworkFile) { setArtworkPreviewUrl(null); return; }
    const url = URL.createObjectURL(artworkFile);
    setArtworkPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [artworkFile]);
  const draftKey = 'oddio-upload-draft-v1';
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Record<string, unknown>;
        if (typeof draft.artistId === 'string' && artists.some(a => a.id === draft.artistId)) setArtistId(draft.artistId);
        if (typeof draft.title === 'string') setTitle(draft.title);
        if (typeof draft.albumId === 'string' && albums.some(a => a.id === draft.albumId && a.artistId === draft.artistId)) setAlbumId(draft.albumId);
        if (typeof draft.description === 'string') setDescription(draft.description);
        if (typeof draft.genreId === 'string' && genres.some(g => g.id === draft.genreId)) setGenreId(draft.genreId);
        if (Array.isArray(draft.selectedMoods)) setSelectedMoods(draft.selectedMoods.filter((v): v is string => typeof v === 'string').slice(0, 5));
        if (typeof draft.languageCode === 'string') setLanguageCode(draft.languageCode);
        if (typeof draft.countryCode === 'string') setCountryCode(draft.countryCode);
        if (draft.productionType === 'fully_ai' || draft.productionType === 'ai_assisted') setProductionType(draft.productionType);
        if (typeof draft.aiTools === 'string') setAiTools(draft.aiTools);
        if (typeof draft.lyrics === 'string') setLyrics(draft.lyrics);
        if (typeof draft.credits === 'string') setCredits(draft.credits);
        if (draft.visibility === 'public' || draft.visibility === 'unlisted' || draft.visibility === 'private') setVisibility(draft.visibility);
        if (typeof draft.releaseAt === 'string') setReleaseAt(draft.releaseAt);
        if (typeof draft.artworkAccent === 'string' && /^#[0-9a-f]{6}$/i.test(draft.artworkAccent)) setArtworkAccent(draft.artworkAccent);
      }
    } catch { /* ignore malformed local draft */ }
    setDraftLoaded(true);
  }, [artists, albums, genres]);
  useEffect(() => {
    if (!draftLoaded) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ artistId, albumId, title, description, genreId, selectedMoods, languageCode, countryCode, productionType, aiTools, lyrics, credits, visibility, releaseAt, artworkAccent })); } catch { /* storage may be unavailable */ }
  }, [draftLoaded, artistId, albumId, title, description, genreId, selectedMoods, languageCode, countryCode, productionType, aiTools, lyrics, credits, visibility, releaseAt, artworkAccent]);
  const artistAlbums = albums.filter((album) => album.artistId === artistId);

  function toggleMood(id: string) {
    setSelectedMoods((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id].slice(0, 5),
    );
  }

  function handleAudioFile(file: File | null) {
    setAudioFile(file);
    if (file && !title.trim()) setTitle(file.name.replace(/\.mp3$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 160));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!rightsConfirmed || !voiceConfirmed) {
      toast(
        locale === 'ar'
          ? 'لازم تأكد حقوق النشر وموافقة استخدام الأصوات قبل الرفع.'
          : 'Confirm your distribution rights and voice consent before uploading.',
        'error',
      );
      return;
    }
    if (!audioFile) {
      toast(t('studio.audioRequired'), 'error');
      return;
    }
    if (
      !/\.mp3$/i.test(audioFile.name) ||
      !['audio/mpeg', 'audio/mp3', ''].includes(audioFile.type)
    ) {
      toast('Only MP3 audio files are allowed.', 'error');
      return;
    }
    if (audioFile.size > 25 * 1024 * 1024) {
      toast('MP3 file must be 25 MB or smaller.', 'error');
      return;
    }
    if (quotaRemaining <= 0) {
      toast(t('studio.quotaReached'), 'error');
      return;
    }
    const form = new FormData();
    form.set('artistId', artistId);
    form.set('rightsConfirmed', 'yes');
    form.set('voiceConfirmed', 'yes');
    if (albumId) form.set('albumId', albumId);
    form.set('title', title);
    form.set('description', description);
    form.set('genreId', genreId);
    form.set('moods', selectedMoods.join(','));
    form.set('languageCode', languageCode);
    form.set('countryCode', countryCode);
    form.set('productionType', productionType);
    form.set('aiTools', aiTools);
    form.set('lyrics', lyrics);
    form.set('credits', credits);
    form.set('visibility', visibility);
    form.set('artworkAccent', artworkAccent);
    if (releaseAt) form.set('releaseAt', new Date(releaseAt).toISOString());
    form.set('audio', audioFile);
    if (artworkFile) form.set('artwork', artworkFile);
    setPending(true);
    try {
      if (production) {
        const grant = await apiRequest<{
          uploadUrl: string;
          objectKey: string;
          headers: Record<string, string>;
        }>('/api/studio/uploads/authorize', {
          method: 'POST',
          body: JSON.stringify({
            filename: audioFile.name,
            contentType: audioFile.type || 'audio/mpeg',
            bytes: audioFile.size,
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        const uploaded = await fetch(grant.uploadUrl, {
          method: 'PUT',
          headers: grant.headers,
          body: audioFile,
        });
        if (!uploaded.ok) throw new Error('Audio transfer to storage failed.');
        form.delete('audio');
        form.delete('artwork');
        form.set('objectKey', grant.objectKey);
        form.set('bytes', String(audioFile.size));
        form.set('contentType', audioFile.type || 'audio/mpeg');
        const finalized = await apiRequest<{ id: string }>('/api/studio/uploads/finalize', { method: 'POST', body: form });
        if (artworkFile) {
          const artworkForm = new FormData();
          artworkForm.set('artwork', artworkFile);
          try {
            await apiRequest(`/api/studio/tracks/${finalized.id}/artwork`, { method: 'POST', body: artworkForm });
          } catch (artworkError) {
            toast(locale === 'ar' ? 'تم رفع الأغنية لكن تعذّر حفظ الغلاف. تواصل مع الدعم لإضافته.' : 'Track submitted, but artwork could not be saved. Contact support to add it.', 'error');
          }
        }
      } else {
        await apiRequest('/api/studio/tracks', { method: 'POST', body: form });
      }
      try { localStorage.removeItem(draftKey); } catch { /* storage unavailable */ }
      toast(t('studio.uploadSuccess'), 'success');
      router.push(`/${locale}/studio/tracks`);
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : t('studio.uploadFailed');
      toast(message, 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-5xl space-y-5">
      <div className="rounded-3xl border border-violet-400/20 bg-gradient-to-r from-[#241b35] to-[#102d3a] p-5 sm:p-7">
        <p className="text-xs font-bold tracking-[.2em] text-violet-300">ODDIO / CREATOR STUDIO</p>
        <h2 className="mt-2 text-2xl font-black text-white">{locale === 'ar' ? ['اختار الفنان', 'تفاصيل الأغنية', 'ارفع وراجع'][step - 1] : ['Choose your artist', 'Track details', 'Upload & review'][step - 1]}</h2>
        <p className="mt-2 text-sm text-white/60">{locale === 'ar' ? '3 خطوات بسيطة لإرسال أغنيتك للمراجعة' : 'Three simple steps to send your track for review.'}</p>
        <div className="mt-5 flex gap-2">{[1, 2, 3].map(n => <span key={n} className={n <= step ? 'h-1.5 flex-1 rounded-full bg-violet-400' : 'h-1.5 flex-1 rounded-full bg-white/15'} />)}</div>
        <p className="mt-2 text-xs text-white/60">{step}/3</p>
      </div>
      <fieldset disabled={step !== 1} className={step === 1 ? 'space-y-5' : 'hidden'}>
      <div className="card relative space-y-4 p-5 has-[button[aria-expanded=true]]:z-50">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('studio.selectArtist')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('studio.selectArtist')} htmlFor="upload-artist">
            <SearchableSelect
              id="upload-artist"
              locale={locale}
              value={artistId}
              onChange={(next) => {
                setArtistId(next);
                setAlbumId('');
              }}
              options={artists.map((artist) => ({
                value: artist.id,
                label: artist.name,
              }))}
              required
            />
          </Field>
          <Field label={t('studio.album')} htmlFor="upload-album">
            <SearchableSelect
              id="upload-album"
              locale={locale}
              value={albumId}
              onChange={setAlbumId}
              options={[
                { value: '', label: t('studio.noAlbum') },
                ...artistAlbums.map((album) => ({ value: album.id, label: album.title })),
              ]}
            />
          </Field>
        </div>
      </div>

      </fieldset>
      <fieldset disabled={step !== 2} className={step === 2 ? 'space-y-5' : 'hidden'}>
      <div className="card relative space-y-4 p-5 has-[button[aria-expanded=true]]:z-50">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('studio.metadata')}
        </h2>
        <Field label={t('studio.trackTitle')} htmlFor="upload-title">
          <input
            id="upload-title"
            required
            maxLength={160}
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label={t('studio.description')} htmlFor="upload-description">
          <textarea
            id="upload-description"
            className="input min-h-20"
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('studio.genre')} htmlFor="upload-genre">
            <SearchableSelect
              id="upload-genre"
              locale={locale}
              value={genreId}
              onChange={setGenreId}
              options={genres.map((genre) => ({
                value: genre.id,
                label: locale === 'ar' ? genre.labelAr : genre.labelEn,
              }))}
              required
            />
          </Field>
          <Field label={t('studio.language')} htmlFor="upload-language">
            <SearchableSelect
              id="upload-language"
              locale={locale}
              value={languageCode}
              onChange={setLanguageCode}
              options={[
                { value: 'ar', label: 'العربية' },
                { value: 'en', label: 'English' },
                { value: 'fr', label: 'Français' },
                { value: 'es', label: 'Español' },
              ]}
            />
          </Field>
        </div>
        <Field label={t('studio.moods')} hint="Up to 5">
          <div className="flex flex-wrap gap-2">
            {moods.map((mood) => {
              const active = selectedMoods.includes(mood.id);
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => toggleMood(mood.id)}
                  aria-pressed={active}
                  className={`rounded-pill border px-3 py-1.5 text-xs transition ${
                    active
                      ? 'border-primary bg-primary/20 text-ink'
                      : 'border-white/10 bg-white/5 text-muted hover:text-ink'
                  }`}
                >
                  {locale === 'ar' ? mood.labelAr : mood.labelEn}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('studio.productionType')} htmlFor="upload-production">
            <SearchableSelect
              id="upload-production"
              locale={locale}
              value={productionType}
              onChange={(next) => setProductionType(next as 'fully_ai' | 'ai_assisted')}
              options={[
                { value: 'fully_ai', label: t('studio.fullyAi') },
                { value: 'ai_assisted', label: t('studio.aiAssisted') },
              ]}
            />
          </Field>
          <Field label={t('studio.country')} htmlFor="upload-country">
            <input
              id="upload-country"
              className="input uppercase"
              maxLength={2}
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
              placeholder="EG"
            />
          </Field>
        </div>
        <button type="button" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen(!advancedOpen)} className="flex w-full items-center justify-between rounded-xl border border-violet-400/20 bg-white/5 p-4 text-sm font-semibold text-violet-200">{locale === 'ar' ? 'تفاصيل إضافية (اختياري)' : 'Advanced details (optional)'}<span>{advancedOpen ? '−' : '+'}</span></button>
        <div className={advancedOpen ? 'space-y-4' : 'hidden'}>
        <Field label={t('studio.aiTools')} htmlFor="upload-tools">
          <input
            id="upload-tools"
            className="input"
            maxLength={300}
            value={aiTools}
            onChange={(event) => setAiTools(event.target.value)}
            placeholder="Suno, Udio, custom model…"
          />
        </Field>
        <Field label={t('studio.lyrics')} htmlFor="upload-lyrics">
          <textarea
            id="upload-lyrics"
            className="input min-h-24 font-mono text-xs"
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
          />
        </Field>
        <Field label={t('studio.credits')} htmlFor="upload-credits">
          <textarea
            id="upload-credits"
            className="input min-h-16"
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
          />
        </Field>
        </div>
      </div>

      </fieldset>
      <fieldset disabled={step !== 3} className={step === 3 ? 'space-y-5' : 'hidden'}>
      <div className="card relative space-y-4 p-5 has-[button[aria-expanded=true]]:z-50">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('studio.audioFile')}
        </h2>
        <Field
          label={t('studio.audioFile')}
          hint="MP3 only · max 25 MB · max 15 min · 256 kbps or higher"
        >
          <FileDropzone
            kind="audio"
            file={audioFile}
            onFile={handleAudioFile}
            locale={locale}
            required
          />
        </Field>
        <Field label={t('studio.artworkFile')} hint="PNG, JPEG, WEBP or GIF · under 5 MB">
          <FileDropzone
            kind="image"
            file={artworkFile}
            onFile={setArtworkFile}
            locale={locale}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('studio.visibility')} htmlFor="upload-visibility">
            <SearchableSelect
              id="upload-visibility"
              locale={locale}
              value={visibility}
              onChange={(next) =>
                setVisibility(next as 'public' | 'unlisted' | 'private')
              }
              options={[
                { value: 'public', label: t('common.public') },
                { value: 'unlisted', label: t('common.unlisted') },
                { value: 'private', label: t('common.private') },
              ]}
            />
          </Field>
          <Field label={t('studio.releaseDate')} htmlFor="upload-release">
            <input
              id="upload-release"
              type="datetime-local"
              className="input"
              value={releaseAt}
              onChange={(event) => setReleaseAt(event.target.value)}
            />
          </Field>
          <Field label={t('studio.accent')} htmlFor="upload-accent">
            <input
              id="upload-accent"
              type="color"
              className="input h-10 p-1"
              value={artworkAccent}
              onChange={(event) => setArtworkAccent(event.target.value)}
            />
          </Field>
        </div>
        <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-[#29203c] to-[#152d39] p-4">
          <p className="mb-3 text-xs font-bold tracking-widest text-violet-200">{locale === 'ar' ? 'معاينة الأغنية' : 'TRACK PREVIEW'}</p>
          <div className="flex items-center gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl text-3xl text-white" style={{ backgroundColor: artworkAccent }}>{artworkPreviewUrl ? <img src={artworkPreviewUrl} alt={locale === 'ar' ? 'غلاف الأغنية' : 'Track artwork'} className="h-full w-full object-cover" /> : '♫'}</div><div className="min-w-0"><p className="truncate font-bold text-white">{title || 'Untitled track'}</p><p className="text-sm text-white/60">{artists.find(a => a.id === artistId)?.name || 'Oddio Artist'}</p><p className="mt-1 text-xs text-violet-200">{audioFile ? audioFile.name : (locale === 'ar' ? 'ارفع ملف MP3 للمتابعة' : 'Add an MP3 to continue')}</p></div></div>
          {audioPreviewUrl && <audio className="mt-4 w-full" controls src={audioPreviewUrl} />}
        </div>
        <fieldset className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <legend className="px-1 text-sm font-bold text-ink">
            {locale === 'ar' ? 'إقرار حقوق المحتوى' : 'Creator rights declaration'}
          </legend>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-ink">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(event) => setRightsConfirmed(event.target.checked)}
              required
              className="mt-1 h-5 w-5 shrink-0 accent-primary"
            />
            <span>
              {locale === 'ar'
                ? 'بأكد إن معايا حق نشر وتوزيع الأغنية والكلمات والصورة وأي مواد مستخدمة.'
                : 'I confirm I have permission to publish and distribute this music, lyrics, artwork and every included asset.'}
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-ink">
            <input
              type="checkbox"
              checked={voiceConfirmed}
              onChange={(event) => setVoiceConfirmed(event.target.checked)}
              required
              className="mt-1 h-5 w-5 shrink-0 accent-primary"
            />
            <span>
              {locale === 'ar'
                ? 'بأكد إني ماقلدتش صوت أو شكل شخص حقيقي من غير إذنه، وإن عندي الموافقات اللازمة لو مستخدم شبهه أو صوته.'
                : 'I confirm I have not impersonated a real person without permission and have the required consent for any recognizable voice or likeness.'}
            </span>
          </label>
          <p className="text-xs leading-5 text-muted">
            {locale === 'ar'
              ? 'الإقرار بيتسجل للمراجعة، لكنه مش إثبات تلقائي للترخيص. الأغنية هتخضع لمراجعة قبل النشر.'
              : 'This declaration is recorded for audit; it does not prove licensing. Every submission remains subject to moderation.'}
          </p>
        </fieldset>
        <Button
          type="submit"
          disabled={!rightsConfirmed || !voiceConfirmed}
          loading={pending}
          size="lg"
          className="w-full sm:w-auto"
        >
          {t('studio.upload')}
        </Button>
      </div>
      </fieldset>
      <p className="text-xs text-muted">{locale === 'ar' ? 'يتم حفظ البيانات محليًا. ملفات الصوت والصور يجب اختيارها مجددًا عند الرجوع.' : 'Details save on this device. Audio and artwork files must be selected again when returning.'}</p>
      <div className="sticky bottom-3 z-20 flex gap-3 rounded-2xl border border-violet-400/20 bg-[#191622]/95 p-3 shadow-xl backdrop-blur">
        {step > 1 && <button type="button" onClick={() => { setStep(step === 3 ? 2 : 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white">{locale === 'ar' ? 'رجوع' : 'Back'}</button>}
        {step < 3 && <button type="button" onClick={() => { if (step === 1 && !artistId) { toast(locale === 'ar' ? 'اختار الفنان أولًا' : 'Select an artist first', 'error'); return; } if (step === 2 && (!title.trim() || !genreId)) { toast(locale === 'ar' ? 'اكتب اسم الأغنية أولًا' : 'Enter a track title first', 'error'); return; } setStep(step === 1 ? 2 : 3); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-700 px-5 py-3 text-sm font-bold text-white">{locale === 'ar' ? 'متابعة' : 'Continue →'}</button>}
      </div>
    </form>
  );
}
