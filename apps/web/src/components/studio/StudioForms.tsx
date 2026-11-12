'use client';

import { useT } from '@/i18n/use-translator';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Artist, Locale } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { slugify } from '@/lib/links';

export function ArtistProfileForm({
  locale,
  artist,
}: {
  locale: Locale;
  artist?: Artist;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(artist?.name ?? '');
  const [slug, setSlug] = useState(artist?.slug ?? '');
  const [bio, setBio] = useState(artist?.bio ?? '');
  const [accent, setAccent] = useState(artist?.accent ?? '#9D5CFF');
  const [social, setSocial] = useState(
    artist?.socialLinks.map((link) => `${link.platform}|${link.url}`).join('\n') ?? '',
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const socialLinks = social
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        const [platform, ...rest] = line.split('|');
        const url = rest.join('|').trim();
        return platform && url ? [{ platform: platform.trim(), url }] : [];
      });
    setPending(true);
    try {
      await apiRequest(
        artist ? `/api/studio/artists/${artist.id}` : '/api/studio/artists',
        {
          method: artist ? 'PATCH' : 'POST',
          body: JSON.stringify({
            name,
            slug: slug || slugify(name),
            bio,
            accent,
            socialLinks,
          }),
        },
      );
      toast(artist ? t('studio.artistSaved') : t('studio.artistCreated'), 'success');
      router.push(`/${locale}/studio/artists`);
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Could not save the artist.';
      toast(message, 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-5">
      <Field label={t('studio.artistName')} htmlFor="artist-name">
        <input
          id="artist-name"
          required
          minLength={2}
          maxLength={80}
          className="input"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!artist && !slug) setSlug(slugify(event.target.value));
          }}
        />
      </Field>
      <Field
        label={t('studio.slug')}
        hint="lowercase-letters-numbers-and-dashes"
        htmlFor="artist-slug"
      >
        <input
          id="artist-slug"
          required
          className="input font-mono text-xs"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
        />
      </Field>
      <Field label={t('studio.bio')} htmlFor="artist-bio">
        <textarea
          id="artist-bio"
          className="input min-h-28"
          maxLength={2000}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
      </Field>
      <Field label={t('studio.accent')} htmlFor="artist-accent">
        <input
          id="artist-accent"
          type="color"
          className="input h-10 w-24 p-1"
          value={accent}
          onChange={(event) => setAccent(event.target.value)}
        />
      </Field>
      <Field
        label={t('studio.socialLinks')}
        hint="One per line: platform|https://example.com"
        htmlFor="artist-social"
      >
        <textarea
          id="artist-social"
          className="input min-h-20 font-mono text-xs"
          value={social}
          onChange={(event) => setSocial(event.target.value)}
        />
      </Field>
      <Button type="submit" loading={pending}>
        {artist ? t('studio.saveArtist') : t('studio.createArtist')}
      </Button>
    </form>
  );
}

export function AlbumCreateForm({ artists }: { artists: Artist[] }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [artistId, setArtistId] = useState(artists[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [releaseAt, setReleaseAt] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await apiRequest('/api/studio/albums', {
        method: 'POST',
        body: JSON.stringify({
          artistId,
          title,
          description,
          releaseAt: releaseAt ? new Date(releaseAt).toISOString() : undefined,
        }),
      });
      toast(t('studio.albumCreated'), 'success');
      setTitle('');
      setDescription('');
      setReleaseAt('');
      router.refresh();
    } catch {
      toast('Could not create the album.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
        {t('studio.newAlbum')}
      </h2>
      <Field label={t('studio.selectArtist')} htmlFor="album-artist">
        <select
          id="album-artist"
          className="input"
          value={artistId}
          onChange={(event) => setArtistId(event.target.value)}
          required
        >
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('studio.albumTitle')} htmlFor="album-title">
        <input
          id="album-title"
          required
          maxLength={160}
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field label={t('studio.albumDescription')} htmlFor="album-description">
        <textarea
          id="album-description"
          className="input min-h-16"
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label={t('studio.releaseDate')} htmlFor="album-release">
        <input
          id="album-release"
          type="datetime-local"
          className="input"
          value={releaseAt}
          onChange={(event) => setReleaseAt(event.target.value)}
        />
      </Field>
      <Button type="submit" loading={pending}>
        {t('studio.newAlbum')}
      </Button>
    </form>
  );
}
