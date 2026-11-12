'use client';

import { useT } from '@/i18n/use-translator';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Artist, Genre, Locale, Mood } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

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
    if (quotaRemaining <= 0) {
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
      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('studio.selectArtist')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('studio.selectArtist')} htmlFor="upload-artist">
            <select
              id="upload-artist"
              className="input"
              value={artistId}
              onChange={(event) => {
                setArtistId(event.target.value);
                setAlbumId('');
              }}
              required
            >
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('studio.album')} htmlFor="upload-album">
            <select
              id="upload-album"
              className="input"
              value={albumId}
              onChange={(event) => setAlbumId(event.target.value)}
            >
              <option value="">{t('studio.noAlbum')}</option>
              {artistAlbums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="card space-y-4 p-5">
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
            <select
              id="upload-genre"
              className="input"
              value={genreId}
              onChange={(event) => setGenreId(event.target.value)}
              required
            >
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {locale === 'ar' ? genre.labelAr : genre.labelEn}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('studio.language')} htmlFor="upload-language">
            <select
              id="upload-language"
              className="input"
              value={languageCode}
              onChange={(event) => setLanguageCode(event.target.value)}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
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
            <select
              id="upload-production"
              className="input"
              value={productionType}
              onChange={(event) =>
                setProductionType(event.target.value as 'fully_ai' | 'ai_assisted')
              }
            >
              <option value="fully_ai">{t('studio.fullyAi')}</option>
              <option value="ai_assisted">{t('studio.aiAssisted')}</option>
            </select>
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

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('studio.audioFile')}
        </h2>
        <Field
          label={t('studio.audioFile')}
          hint="WAV, FLAC or MP3 · min 256 kbps · max 15 min · max 100 MB"
        >
          <input
            type="file"
            accept="audio/*"
            required
            onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
            className="input file:me-3 file:rounded-pill file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-ink"
          />
        </Field>
        <Field label={t('studio.artworkFile')} hint="PNG, JPEG, WEBP or GIF · under 5 MB">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => setArtworkFile(event.target.files?.[0] ?? null)}
            className="input file:me-3 file:rounded-pill file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-ink"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('studio.visibility')} htmlFor="upload-visibility">
            <select
              id="upload-visibility"
              className="input"
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as 'public' | 'unlisted' | 'private')
              }
            >
              <option value="public">{t('common.public')}</option>
              <option value="unlisted">{t('common.unlisted')}</option>
              <option value="private">{t('common.private')}</option>
            </select>
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
