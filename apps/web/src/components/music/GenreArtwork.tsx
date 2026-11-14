type Props = { slug: string; index: number };

// Locally hosted artwork supplied for each genre.
const genreImages: Record<string, string> = {
  'acoustic': 'Acoustic.webp',
  'afrobeats': 'Afrobeats.webp',
  'alternative-rock': 'Alternative Rock.webp',
  'amapiano': 'Amapiano.webp',
  'ambient': 'Ambient.webp',
  'arabic-classical': 'Arabic Classical.webp',
  'arabic-pop': 'Arabic Pop.webp',
  'bedouin': 'Bedouin.webp',
  'blues': 'Blues.webp',
  'chillout': 'Chillout.webp',
  'cinematic': 'Cinematic.webp',
  'classical': 'Classical.webp',
  'country': 'Country.webp',
  'dabke': 'Dabke.webp',
  'dance': 'Dance.webp',
  'deep-house': 'Deep House.webp',
  'disco': 'Disco.webp',
  'downtempo': 'Downtempo.webp',
  'drill': 'Drill.webp',
  'dubstep': 'Dubstep.webp',
  'edm': 'EDM.webp',
  'electronic': 'Electronic.webp',
  'experimental': 'Experimental.webp',
  'folk': 'Folk.webp',
  'funk': 'Funk.webp',
  'gospel': 'Gospel.webp',
  'hip-hop': 'Hip-hop.webp',
  'house': 'House.webp',
  'indie': 'Indie.webp',
  'instrumental': 'Instrumental.webp',
  'jazz': 'Jazz.webp',
  'khaleeji': 'Khaleeji.webp',
  'latin': 'Latin.webp',
  'lo-fi': 'Lo-fi.webp',
  'mahraganat': 'Mahraganat.webp',
  'metal': 'Metal.webp',
  'nasheed': 'Nasheed.webp',
  'nubian': 'Nubian.webp',
  'orchestral': 'Orchestral.webp',
  'oriental': 'Oriental.webp',
  'pop': 'Pop.webp',
  'punk': 'Punk.webp',
  'r-and-b': 'R&B.webp',
  'rai': 'Rai.webp',
  'rap': 'Rap.webp',
  'reggae': 'Reggae.webp',
  'reggaeton': 'Reggaeton.webp',
  'rock': 'Rock.webp',
  'shaabi': 'Shaabi.webp',
  'soul': 'Soul.webp',
  'soundtrack': 'Soundtrack.webp',
  'sufi': 'Sufi.webp',
  'synthwave': 'Synthwave.webp',
  'tarab': 'Tarab.webp',
  'techno': 'Techno.webp',
  'trance': 'Trance.webp',
  'trap': 'Trap.webp',
  'world-music': 'World Music.webp',
  'r&b': 'R&B.webp',
  'khaliji': 'Khaleeji.webp',
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
  const image = genreImages[normalizedGenre(slug)];
  return image ? `/genres/${encodeURIComponent(image)}?v=genre-artwork-20261114` : null;
}

export function GenreArtwork({ slug }: Props) {
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
        background: photo
          ? `url("${photo}") center / cover no-repeat`
          : `radial-gradient(ellipse at 72% 25%, hsl(${(hue + 65) % 360} 70% 44% / .65), transparent 58%), linear-gradient(140deg, hsl(${hue} 63% 35%), #090817)`,
      }}
    >
      {!photo && (
        <>
          <div className="absolute -right-8 -top-10 h-44 w-44 rotate-12 rounded-full border-[18px] border-white/10" />
          <div className="absolute left-4 top-3 text-[110px] leading-none opacity-60 drop-shadow-[0_8px_25px_rgba(0,0,0,.5)]">
            {motif}
          </div>
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/5" />
    </div>
  );
}
