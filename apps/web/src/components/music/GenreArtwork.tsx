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
  'hip-hop': 'photo-1516280440614-37939bbacd81', // urban street culture
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
  'r-and-b': 'photo-1493225457124-a3eb161ffa5f', // R&B vocalist
  'r&b': 'photo-1493225457124-a3eb161ffa5f',
  'arabic-pop': 'photo-1501386761578-eac5c94b800a',
  mahraganat: 'photo-1506157786151-b8491531f063',
  shaabi: 'photo-1528605248644-14dd04022da1',
  khaliji: 'photo-1511196044526-5cb3bcb7071b',
  khaleeji: 'photo-1500530855697-b586d89ba3ee',
  nasheed: 'photo-1470252649378-9c29740c9fa8',
  'arabic-rap': 'photo-1547355253-ff0740f6e8c1',
  'arabic-hip-hop': 'photo-1514525253161-7a46d19cd819',
  'arabic-folk': 'photo-1504609813442-a8924e83f76e',
};

// Every card has a locally rendered visual, even when a photo host is blocked.
const motifs: Record<string, string> = {
  shaabi: '🪗',
  tarab: '🎻',
  'arabic-classical': '🪕',
  oriental: '🪕',
  mahraganat: '🎤',
  dabke: '🥁',
  'arabic-pop': '🎙️',
  'arabic-rap': '🎧',
  'hip-hop': '🎤',
  jazz: '🎷',
  blues: '🎸',
  rock: '🎸',
  reggae: '🌴',
  afrobeats: '🥁',
  amapiano: '🎹',
  dance: '🪩',
  edm: '🎛️',
  house: '🎚️',
  techno: '🎛️',
  trance: '✨',
  ambient: '🌌',
  cinematic: '🎬',
  synthwave: '🌆',
  electronic: '🎹',
  pop: '🎙️',
  folk: '🪕',
  metal: '🎸',
  punk: '⚡',
  soul: '🎙️',
  'r-and-b': '🎙️',
  nasheed: '🎙️',
  khaliji: '🪕',
  khaleeji: '🪕',
};
function normalizedGenre(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[\\s_]+/g, '-');
}
function photoForGenre(slug: string): string | null {
  const photo = photos[normalizedGenre(slug)];
  return photo
    ? `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=720&q=85`
    : null;
}

export function GenreArtwork({ slug }: Props) {
  const [failed, setFailed] = useState(false);
  const normalized = normalizedGenre(slug);
  const photo = photoForGenre(slug);
  const hash = [...normalized].reduce((n, ch) => (n * 33 + ch.charCodeAt(0)) >>> 0, 5381);
  const hue = hash % 360;
  const motif = motifs[normalized] ?? '♫';
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 72% 25%, hsl(${(hue + 65) % 360} 70% 44% / .65), transparent 58%), linear-gradient(140deg, hsl(${hue} 63% 35%), #090817)`,
      }}
    >
      <div className="absolute -right-8 -top-10 h-44 w-44 rounded-full border-[18px] border-white/10 rotate-12" />
      <div className="absolute left-4 top-3 text-[110px] leading-none opacity-60 drop-shadow-[0_8px_25px_rgba(0,0,0,.5)] transition-transform duration-700 group-hover:scale-110">
        {motif}
      </div>
      {photo && !failed && (
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/5" />
    </div>
  );
}
