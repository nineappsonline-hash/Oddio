type Locale = 'ar' | 'en';
type LocalLabel = { labelAr: string; labelEn: string };

const clean = (s?: string | null) => s?.replace(/\s+/g, ' ').trim() ?? '';
const label = (value: LocalLabel | undefined, locale: Locale) =>
  clean(locale === 'ar' ? value?.labelAr : value?.labelEn);

function time(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds) || seconds < 1) return '';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = String(total % 60).padStart(2, '0');
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}`
    : `${minutes}:${remainder}`;
}

export function searchDescription(description: string) {
  const text = Array.from(clean(description));
  if (text.length <= 160) return text.join('');
  const clipped = text.slice(0, 157).join('');
  const boundary = clipped.lastIndexOf(' ');
  return `${(boundary > 110 ? clipped.slice(0, boundary) : clipped).trimEnd()}…`;
}

type TrackFacts = {
  title: string;
  description?: string;
  artist?: { name: string };
  genre?: LocalLabel;
  moods?: LocalLabel[];
  durationMs?: number;
};

export function describeTrack(track: TrackFacts, locale: Locale) {
  if (clean(track.description)) return track.description!;
  const ar = locale === 'ar';
  const title = clean(track.title);
  const artist = clean(track.artist?.name);
  const genre = label(track.genre, locale);
  const moods = [
    ...new Set(track.moods?.map((mood) => label(mood, locale)).filter(Boolean)),
  ].slice(0, 2);
  const duration = time((track.durationMs ?? 0) / 1000);
  return [
    ar
      ? `اسمع «${title}»${artist ? ` من ${artist}` : ''} على Oddio.`
      : `Listen to “${title}”${artist ? ` by ${artist}` : ''} on Oddio.`,
    genre && (ar ? `النوع: ${genre}.` : `Genre: ${genre}.`),
    moods.length > 0 &&
      (ar ? `المزاج: ${moods.join('، ')}.` : `Mood: ${moods.join(', ')}.`),
    duration && (ar ? `المدة: ${duration}.` : `Duration: ${duration}.`),
  ]
    .filter(Boolean)
    .join(' ');
}

type ShowFacts = { title: string; description?: string; author?: string };

export function describePodcastShow(
  show: ShowFacts,
  locale: Locale,
  {
    category,
    hasEpisodes,
    editorial,
  }: { category?: string; hasEpisodes: boolean; editorial?: string },
) {
  if (clean(show.description)) return show.description!;
  if (clean(editorial)) return editorial!;
  const ar = locale === 'ar';
  const title = clean(show.title);
  const host = clean(show.author);
  const subject = clean(category);
  return [
    ar
      ? `«${title}» سلسلة بودكاست${host ? ` من تقديم ${host}` : ''} على Oddio.`
      : `“${title}” is a podcast series${host ? ` hosted by ${host}` : ''} on Oddio.`,
    subject && (ar ? `التصنيف: ${subject}.` : `Category: ${subject}.`),
    hasEpisodes &&
      (ar
        ? 'تصفّح الحلقات المنشورة واختار اللي تحب تسمعها.'
        : 'Browse the published episodes and pick one to play.'),
  ]
    .filter(Boolean)
    .join(' ');
}

export function describePodcastEpisode(
  episode: {
    title: string;
    description?: string;
    durationSeconds?: number;
    episodeNumber?: number | null;
    seasonNumber?: number | null;
  },
  show: { title: string },
  locale: Locale,
  editorial?: string,
) {
  if (clean(episode.description)) return episode.description!;
  if (clean(editorial)) return editorial!;
  const ar = locale === 'ar';
  const title = clean(episode.title);
  const series = clean(show.title);
  const duration = time(episode.durationSeconds);
  const numbering = [
    Number.isInteger(episode.seasonNumber) &&
      (episode.seasonNumber ?? 0) > 0 &&
      (ar ? `الموسم ${episode.seasonNumber}` : `Season ${episode.seasonNumber}`),
    Number.isInteger(episode.episodeNumber) &&
      (episode.episodeNumber ?? 0) > 0 &&
      (ar ? `الحلقة ${episode.episodeNumber}` : `Episode ${episode.episodeNumber}`),
  ].filter(Boolean);
  return [
    ar
      ? `اسمع «${title}» من بودكاست «${series}» على Oddio.`
      : `Listen to “${title}” from the podcast “${series}” on Oddio.`,
    numbering.length > 0 && `${numbering.join(ar ? '، ' : ', ')}.`,
    duration && (ar ? `المدة: ${duration}.` : `Duration: ${duration}.`),
  ]
    .filter(Boolean)
    .join(' ');
}
