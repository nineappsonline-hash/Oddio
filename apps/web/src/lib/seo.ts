import type { Metadata } from 'next';
import type { Locale } from '@ai-music/contracts';
import { absoluteUrl } from './utils';

export function buildMetadata({
  locale,
  title,
  description,
  path = '',
  noindex = false,
  type = 'website',
}: {
  locale: Locale;
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
  type?: 'website' | 'music.song' | 'music.album' | 'profile' | 'article';
}): Metadata {
  const localizedPath = `/${locale}${path}`;
  const canonical = absoluteUrl(localizedPath);
  const ogImage = absoluteUrl(
    `/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description.slice(0, 120))}`,
  );
  return {
    title,
    description,
    metadataBase: new URL(absoluteUrl('/')),
    alternates: {
      canonical,
      languages: {
        en: absoluteUrl(`/en${path}`),
        ar: absoluteUrl(`/ar${path}`),
        'x-default': absoluteUrl(`/en${path}`),
      },
    },
    robots: noindex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Project AI Music',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
      type: type as 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export function musicRecordingJsonLd(input: {
  title: string;
  artistName: string;
  url: string;
  durationMs: number;
  releaseAt: string;
  genre?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: input.title,
    byArtist: { '@type': 'MusicGroup', name: input.artistName },
    url: input.url,
    duration: `PT${Math.round(input.durationMs / 1000)}S`,
    datePublished: input.releaseAt,
    genre: input.genre,
    inLanguage: 'ar',
  };
}

export function musicAlbumJsonLd(input: {
  title: string;
  artistName: string;
  url: string;
  releaseAt: string;
  tracks: Array<{ title: string; url: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name: input.title,
    byArtist: { '@type': 'MusicGroup', name: input.artistName },
    url: input.url,
    datePublished: input.releaseAt,
    numTracks: input.tracks.length,
    track: input.tracks.map((track) => ({
      '@type': 'MusicRecording',
      name: track.title,
      url: track.url,
    })),
  };
}

export function artistJsonLd(input: { name: string; url: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: input.name,
    url: input.url,
    description: input.description,
  };
}
