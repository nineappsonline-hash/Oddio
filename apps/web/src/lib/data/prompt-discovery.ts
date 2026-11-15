import type { Viewer } from '@ai-music/db';
import type { DemoDb } from './types';
import { listableTracks, type CatalogTrack } from './queries';

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('en')
    .normalize('NFKC')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
const synonyms: Record<string, string[]> = {
  chill: ['chill', 'relax', 'calm', 'هادئ', 'هادي', 'استرخاء', 'رايق', 'رايقين'],
  happy: ['happy', 'joy', 'upbeat', 'سعيد', 'سعاده', 'فرح', 'مبهج'],
  sad: ['sad', 'melancholy', 'حزين', 'حزن', 'كئيب'],
  workout: ['workout', 'gym', 'energy', 'حماس', 'تمرين', 'جيم', 'طاقه'],
  romantic: ['romance', 'romantic', 'love', 'حب', 'رومانسي'],
  arabic: ['arabic', 'arab', 'عربي', 'عربيه'],
  english: ['english', 'انجليزي', 'إنجليزي'],
};

function containsTerm(text: string, term: string): boolean {
  const input = ' ' + normalize(text) + ' ';
  const word = normalize(term);
  return word.length > 1 && input.includes(' ' + word + ' ');
}

export function promptDiscoveryTracks(
  db: DemoDb,
  viewer: Viewer,
  prompt: string,
  limit = 12,
): { tracks: CatalogTrack[]; matched: boolean } {
  const text = normalize(prompt).slice(0, 240);
  if (text.length < 3) return { tracks: [], matched: false };
  const catalog = listableTracks(db, viewer).filter(
    (track) => track.access.allowed && track.audio?.processingStatus === 'ready',
  );
  const tokens = text
    .split(' ')
    .filter((part) => part.length > 2)
    .slice(0, 24);
  const intents = Object.entries(synonyms)
    .filter(([, terms]) => terms.some((term) => containsTerm(text, term)))
    .map(([name]) => name);
  const ranked = catalog
    .map((track) => {
      const genres = db.genres.filter((genre) =>
        (track.genreIds?.length ? track.genreIds : [track.genreId]).includes(genre.id),
      );
      const moods = db.moods.filter((mood) => track.moodIds.includes(mood.id));
      const genreText = genres
        .map((genre) => genre.labelEn + ' ' + genre.labelAr + ' ' + genre.slug)
        .join(' ');
      const moodText = moods
        .map((mood) => mood.labelEn + ' ' + mood.labelAr + ' ' + mood.slug)
        .join(' ');
      const artistText = track.artist?.name ?? '';
      let score = 0;
      for (const word of tokens) {
        if (containsTerm(genreText, word)) score += 6;
        if (containsTerm(moodText, word)) score += 6;
        if (containsTerm(artistText, word)) score += 4;
        if (containsTerm(track.title, word)) score += 2;
      }
      for (const intent of intents) {
        const terms = synonyms[intent] ?? [];
        if (intent === 'arabic' && track.languageCode === 'ar') score += 6;
        if (intent === 'english' && track.languageCode === 'en') score += 6;
        if (terms.some((term) => containsTerm(genreText + ' ' + moodText, term)))
          score += 5;
      }
      return { track, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.track.qualifiedPlays - a.track.qualifiedPlays ||
        a.track.id.localeCompare(b.track.id),
    );
  const matched = ranked.some((item) => item.score > 0);
  // Do not claim that a completely unrecognized prompt has been interpreted.
  if (!matched) return { tracks: [], matched: false };
  const scored = ranked.filter((item) => item.score > 0);
  const selected: CatalogTrack[] = [];
  const artists = new Set<string>();
  const cap = Math.max(1, Math.min(20, Math.floor(limit)));
  for (const item of scored) {
    if (selected.length >= cap) break;
    if (artists.has(item.track.artistId)) continue;
    selected.push(item.track);
    artists.add(item.track.artistId);
  }
  for (const item of scored) {
    if (selected.length >= cap) break;
    if (!selected.some((track) => track.id === item.track.id)) selected.push(item.track);
  }
  return { tracks: selected, matched };
}
