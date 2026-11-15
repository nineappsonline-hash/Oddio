import type { Metadata } from 'next';
import type { Locale } from '@ai-music/contracts';
import { absoluteUrl } from './utils';
import { seoPage } from './seo-copy';

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
  const copy = seoPage(locale, path);
  const pageTitle = copy?.title ?? title;
  const pageDescription = copy?.description ?? description;
  const fullTitle = pageTitle.includes('Oddio') ? pageTitle : `${pageTitle} | Oddio`;
  const localizedPath = `/${locale}${path}`;
  const canonical = absoluteUrl(localizedPath);
  const ogImage = absoluteUrl(
    `/api/og?title=${encodeURIComponent(pageTitle)}&subtitle=${encodeURIComponent(pageDescription.slice(0, 120))}`,
  );
  return {
    title: { absolute: fullTitle },
    description: pageDescription,
    applicationName: 'Oddio',
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
      title: fullTitle,
      description: pageDescription,
      url: canonical,
      siteName: 'Oddio',
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
      type: type as 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: pageTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: pageDescription,
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
  languageCode?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: input.title,
    ...(input.artistName ? { byArtist: { '@type': 'MusicGroup', name: input.artistName } } : {}),
    url: new URL(input.url, absoluteUrl('/')).toString(),
    ...(input.durationMs > 0 ? { duration: `PT${Math.round(input.durationMs / 1000)}S` } : {}),
    datePublished: input.releaseAt,
    genre: input.genre,
    ...(input.languageCode ? { inLanguage: input.languageCode } : {}),
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
    url: new URL(input.url, absoluteUrl('/')).toString(),
    datePublished: input.releaseAt,
    numTracks: input.tracks.length,
    track: input.tracks.map((track) => ({
      '@type': 'MusicRecording',
      name: track.title,
      url: new URL(track.url, absoluteUrl('/')).toString(),
    })),
  };
}

export function artistJsonLd(input: { name: string; url: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: input.name,
    url: new URL(input.url, absoluteUrl('/')).toString(),
    ...(input.description ? { description: input.description } : {}),
  };
}
