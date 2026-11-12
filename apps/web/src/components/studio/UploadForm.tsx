'use client';

import { useT } from '@/i18n/use-translator';

import { useState } from 'react';
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
  const [pending, setPending] = useState(false);

  const artistAlbums = albums.filter((album) => album.artistId === artistId);

  function toggleMood(id: string) {
    setSelectedMoods((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id].slice(0, 5),
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!audioFile) {
      toast(t('studio.audioRequired'), 'error');
      return;
    }
    if (!/\.mp3$/i.test(audioFile.name) || !['audio/mpeg', 'audio/mp3', ''].includes(audioFile.type)) {\n      toast('Only MP3 audio files are allowed.', 'error');\n      return;\n    }\n    if (audioFile.size > 25 * 1024 * 1024) {\n      toast('MP3 file must be 25 MB or smaller.', 'error');\n      return;\n    }\n    if (quotaRemaining <= 0) {
      toast(t('studio.quotaReached'), 'error');
      return;
    }
    const form = new FormData();
    form.set('artistId', artistId);
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
          uploadUrl: string; objectKey: string; headers: Record<string, string>;
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
          method: 'PUT', headers: grant.headers, body: audioFile,
        });
        if (!uploaded.ok) throw new Error('Audio transfer to storage failed.');
        form.delete('audio');
        form.delete('artwork');
        form.set('objectKey', grant.objectKey);
        form.set('bytes', String(audioFile.size));
        form.set('contentType', audioFile.type || 'audio/mpeg');
        await apiRequest('/api/studio/uploads/finalize', { method: 'POST', body: form });
      } else {
        await apiRequest('/api/studio/tracks', { method: 'POST', body: form });
      }
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
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="card relative space-y-4 p-5 has-[button[aria-expanded=true]]:z-50">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('studio.selectArtist')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('studio.selectArtist')} htmlFor="upload-artist">
            <SearchableSelect id="upload-artist" locale={locale} value={artistId} onChange={(next) => { setArtistId(next); setAlbumId(''); }} options={artists.map((artist) => ({ value: artist.id, label: artist.name }))} required />
          </Field>
          <Field label={t('studio.album')} htmlFor="upload-album">
            <SearchableSelect id="upload-album" locale={locale} value={albumId} onChange={setAlbumId} options={[{ value: '', label: t('studio.noAlbum') }, ...artistAlbums.map((album) => ({ value: album.id, label: album.title }))]}  />
          </Field>
        </div>
      </div>

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
            <SearchableSelect id="upload-genre" locale={locale} value={genreId} onChange={setGenreId} options={genres.map((genre) => ({ value: genre.id, label: locale === 'ar' ? genre.labelAr : genre.labelEn }))} required />
          </Field>
          <Field label={t('studio.language')} htmlFor="upload-language">
            <SearchableSelect id="upload-language" locale={locale} value={languageCode} onChange={setLanguageCode} options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }, { value: 'es', label: 'Español' }]}  />
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
            <SearchableSelect id="upload-production" locale={locale} value={productionType} onChange={(next) => setProductionType(next as 'fully_ai' | 'ai_assisted')} options={[{ value: 'fully_ai', label: t('studio.fullyAi') }, { value: 'ai_assisted', label: t('studio.aiAssisted') }]}  />
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

      <div className="card relative space-y-4 p-5 has-[button[aria-expanded=true]]:z-50">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('studio.audioFile')}
        </h2>
        <Field
          label={t('studio.audioFile')}
          hint="MP3 only · max 25 MB · max 15 min · 256 kbps or higher"
        >
          <FileDropzone kind="audio" file={audioFile} onFile={setAudioFile} locale={locale} required />
        </Field>
        <Field label={t('studio.artworkFile')} hint="PNG, JPEG, WEBP or GIF · under 5 MB">
          <FileDropzone kind="image" file={artworkFile} onFile={setArtworkFile} locale={locale} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('studio.visibility')} htmlFor="upload-visibility">
            <SearchableSelect id="upload-visibility" locale={locale} value={visibility} onChange={(next) => setVisibility(next as 'public' | 'unlisted' | 'private')} options={[{ value: 'public', label: t('common.public') }, { value: 'unlisted', label: t('common.unlisted') }, { value: 'private', label: t('common.private') }]}  />
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
        <Button type="submit" loading={pending} size="lg" className="w-full sm:w-auto">
          {t('studio.upload')}
        </Button>
      </div>
    </form>
  );
}
