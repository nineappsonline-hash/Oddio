'use client';

import { useState } from 'react';

type Props = { slug: string; index: number };

// Curated photographic covers. Keep the genre name as HTML text over the image.
const photos: Record<string, string> = {
  reggae: 'photo-1500534623283-312aade485b7',
  afrobeats: 'photo-1516280440614-37939bbacd81',
  amapiano: 'photo-1519608487953-e999c86e7455',
  dance: 'photo-1533174072545-7a4b6ad7a6c3',
  edm: 'photo-1470225620780-dba8ba36b745',
  house: 'photo-1493225457124-a3eb161ffa5f',
  techno: 'photo-1571266028243-d220c9a3a157',
  trance: 'photo-1459749411175-04bf5292ceea',
  rock: 'photo-1498038432885-c6f3f1b912ee',
  'hip-hop': 'photo-1547355253-ff0740f6e8c1',
  jazz: 'photo-1511196044526-5cb3bcb7071b',
  blues: 'photo-1510915361894-db8b60106cb1',
  soul: 'photo-1516280440614-37939bbacd81',
  pop: 'photo-1501386761578-eac5c94b800a',
  ambient: 'photo-1470252649378-9c29740c9fa8',
  cinematic: 'photo-1519681393784-d120267933ba',
  synthwave: 'photo-1519608487953-e999c86e7455',
  electronic: 'photo-1470225620780-dba8ba36b745',
  metal: 'photo-1524368535928-5b5e00ddc76b',
  punk: 'photo-1524368535928-5b5e00ddc76b',
  folk: 'photo-1510915361894-db8b60106cb1',
  dabke: 'photo-1516280440614-37939bbacd81',
  'r-and-b': 'photo-1516280440614-37939bbacd81',
  'r&b': 'photo-1516280440614-37939bbacd81',
};

const fallback = [
  'photo-1493225457124-a3eb161ffa5f',
  'photo-1459749411175-04bf5292ceea',
  'photo-1501386761578-eac5c94b800a',
];

export function GenreArtwork({ slug, index }: Props) {
  const [failed, setFailed] = useState(false);
  const photo = photos[slug.toLowerCase()] ?? fallback[index % fallback.length];
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
