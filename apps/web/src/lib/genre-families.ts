import type { Genre } from '@ai-music/contracts';

/** Navigation-only genre families. The canonical genre slug remains unchanged. */
const families = [
  {
    id: 'arabic',
    en: 'Arabic Music',
    ar: 'الموسيقى العربية',
    descriptionEn: 'From tarab and shaabi to today’s regional sounds.',
    descriptionAr: 'من الطرب والشعبي إلى أحدث الأصوات العربية.',
    slugs: [
      'arabic-pop', 'shaabi', 'mahraganat', 'tarab', 'khaleeji', 'khaliji',
      'rai', 'dabke', 'arabic-classical', 'arabic-folk', 'arabic-rap',
      'arabic-hip-hop', 'oriental', 'nasheed', 'arabic', 'egyptian',
      'egyptian-pop', 'arabic-indie', 'arabic-rock', 'arabic-jazz',
      'sha3by', 'maghrebi', 'andalusian', 'arabesk', 'bedouin',
      'nubian', 'sufi',
    ],
  },
  {
    id: 'pop',
    en: 'Pop & Contemporary',
    ar: 'البوب والموسيقى المعاصرة',
    descriptionEn: 'Current favorites, soulful grooves and fresh voices.',
    descriptionAr: 'بوب معاصر وأصوات جديدة وإيقاعات مميزة.',
    slugs: [
      'pop', 'indie', 'indie-pop', 'r-and-b', 'r&b', 'rnb',
      'soul', 'funk', 'disco', 'dance-pop', 'electropop',
      'synth-pop', 'synthpop', 'alternative-pop', 'k-pop',
      'latin-pop', 'bedroom-pop', 'contemporary', 'neo-soul',
    ],
  },
  {
    id: 'hiphop',
    en: 'Hip-Hop & Urban',
    ar: 'الهيب هوب والموسيقى الحضرية',
    descriptionEn: 'Beats, bars and bass-led sounds.',
    descriptionAr: 'راب وتراب وإيقاعات حضرية قوية.',
    slugs: [
      'hiphop', 'hip-hop', 'rap', 'trap', 'drill', 'boom-bap',
      'grime', 'lofi-hip-hop', 'old-school-hip-hop',
      'urban', 'gangsta-rap', 'conscious-rap', 'phonk',
    ],
  },
  {
    id: 'electronic',
    en: 'Electronic & Dance',
    ar: 'الإلكترونية والرقص',
    descriptionEn: 'Club energy, synths and late-night frequencies.',
    descriptionAr: 'ترددات إلكترونية وطاقة الرقص والسهر.',
    slugs: [
      'electronic', 'edm', 'house', 'deep-house', 'tech-house',
      'techno', 'trance', 'dubstep', 'drum-and-bass',
      'drum-bass', 'dnb', 'dance', 'electro', 'synthwave',
      'future-bass', 'hardstyle', 'breakbeat', 'garage',
      'uk-garage', 'downtempo', 'trip-hop', 'progressive-house',
      'psytrance', 'minimal-techno', 'experimental',
    ],
  },
  {
    id: 'rock',
    en: 'Rock & Alternative',
    ar: 'الروك والبديل',
    descriptionEn: 'Guitars, raw energy and alternative scenes.',
    descriptionAr: 'جيتارات وروك وطاقة موسيقية مختلفة.',
    slugs: [
      'rock', 'alternative-rock', 'alternative', 'metal', 'heavy-metal',
      'punk', 'punk-rock', 'hard-rock', 'indie-rock',
      'grunge', 'post-rock', 'progressive-rock', 'emo',
      'shoegaze', 'metalcore', 'pop-punk',
    ],
  },
  {
    id: 'chill',
    en: 'Chill & Instrumental',
    ar: 'الهادئة والآلات الموسيقية',
    descriptionEn: 'Slow moments, instrumental journeys and deep focus.',
    descriptionAr: 'أجواء هادئة وموسيقى آلية للتركيز والاسترخاء.',
    slugs: [
      'ambient', 'lo-fi', 'lofi', 'acoustic', 'classical',
      'cinematic', 'instrumental', 'piano', 'orchestral',
      'soundtrack', 'meditation', 'new-age', 'chill',
      'chillout', 'jazz', 'blues', 'folk', 'neo-classical',
      'neoclassical', 'easy-listening', 'sleep', 'world-folk',
    ],
  },
] as const;

/** Unmapped genres stay browsable instead of silently disappearing. */
const otherFamily = {
  id: 'other',
  en: 'World & More',
  ar: 'موسيقى عالمية وأنواع أخرى',
  descriptionEn: 'Explore more sounds from around the world.',
  descriptionAr: 'استكشف المزيد من الأصوات والأنواع حول العالم.',
};

type GenreWithCount = Genre & { count: number };

function normalizedSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

export function groupGenres(genres: GenreWithCount[]) {
  const assigned = new Set<string>();
  const groups = families.map((family) => {
    const slugs = new Set<string>(family.slugs);
    const items = genres.filter((genre) => {
      if (assigned.has(genre.id) || !slugs.has(normalizedSlug(genre.slug))) return false;
      assigned.add(genre.id);
      return true;
    });
    return { ...family, genres: items };
  });
  const unmapped = genres.filter((genre) => !assigned.has(genre.id));
  return [
    ...groups.filter((group) => group.genres.length > 0),
    ...(unmapped.length ? [{ ...otherFamily, genres: unmapped }] : []),
  ];
}
