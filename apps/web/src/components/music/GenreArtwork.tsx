'use client';

import { useState } from 'react';

type Props = { slug: string; index: number };

// Curated photographic covers. Keep the genre name as HTML text over the image.
// One distinct photographic image per genre, selected around its musical identity.
// Aliases of the same genre intentionally share a cover.
const photos: Record<string, string> = {
  reggae: 'photo-1542838132-92c53300491e', // tropical, warm Jamaican palette
  afrobeats: 'photo-1508700115892-45ecd05ae2ad', // African dance and movement
  amapiano: 'photo-1514525253161-7a46d19cd819', // night crowd
  dance: 'photo-1533174072545-7a4b6ad7a6c3', // disco party
  edm: 'photo-1470225620780-dba8ba36b745', // electronic DJ decks
  house: 'photo-1571266028243-d220c9a3a157', // club lighting
  techno: 'photo-1519608487953-e999c86e7455', // futuristic neon city
  trance: 'photo-1459749411175-04bf5292ceea', // festival light show
  rock: 'photo-1498038432885-c6f3f1b912ee', // electric guitar
  'hip-hop': 'photo-1547355253-ff0740f6e8c1', // urban street culture
  jazz: 'photo-1511196044526-5cb3bcb7071b', // jazz performance
  blues: 'photo-1510915361894-db8b60106cb1', // guitar close-up
  soul: 'photo-1516280440614-37939bbacd81', // soulful singer
  pop: 'photo-1501386761578-eac5c94b800a', // pop concert crowd
  ambient: 'photo-1470252649378-9c29740c9fa8', // atmospheric landscape
  cinematic: 'photo-1519681393784-d120267933ba', // epic mountain night
  synthwave: 'photo-1500534623283-312aade485b7', // retro sunset landscape
  electronic: 'photo-1493225457124-a3eb161ffa5f', // live electronic performance
  metal: 'photo-1524368535928-5b5e00ddc76b', // heavy live show
  punk: 'photo-1521337581100-8ca9a73a5f79', // alternative live culture
  folk: 'photo-1511379938547-c1f69419868d', // acoustic studio
  dabke: 'photo-1504609813442-a8924e83f76e', // group dance
  'r-and-b': 'photo-1483412033650-1015ddeb83d1', // R&B vocalist
  'r&b': 'photo-1483412033650-1015ddeb83d1',
};

// Unknown genres get a stable genre-specific image rather than repeating a small fallback list.
const fallbackPhotos = [
  'photo-1516280440614-37939bbacd81',
  'photo-1511379938547-c1f69419868d',
  'photo-1470225620780-dba8ba36b745',
  'photo-1498038432885-c6f3f1b912ee',
  'photo-1514525253161-7a46d19cd819',
];
function photoForGenre(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (photos[normalized]) return photos[normalized];
  const hash = [...normalized].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return fallbackPhotos[hash % fallbackPhotos.length];
}

export function GenreArtwork({ slug }: Props) {
  const [failed, setFailed] = useState(false);
  const photo = photoForGenre(slug);
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-gradient-to-br from-violet-800 via-slate-900 to-fuchsia-950">
      {!failed && (
        <img
          src={`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=720&q=85`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/5" />
    </div>
  );
}
