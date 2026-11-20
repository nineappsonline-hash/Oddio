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

export type DiscoveryMatchReason = { kind: 'genre' | 'mood' | 'language' | 'artist' | 'title'; value: string };

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
): { tracks: CatalogTrack[]; matched: boolean; reasons: Record<string, DiscoveryMatchReason[]> } {
  const text = normalize(prompt).slice(0, 240);
  if (text.length < 3) return { tracks: [], matched: false, reasons: {} };
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
  // Only apply hard facets when a user phrase explicitly matches known
  // catalog labels. Never invent BPM, vocals or language from a genre name.
  const requestedGenres = db.genres
    .filter((genre) => genre.active)
    .filter((genre) => [genre.labelEn, genre.labelAr, genre.slug]
      .some((label) => containsTerm(text, label)))
    .map((genre) => genre.id);
  const requestedMoods = db.moods
    .filter((mood) => mood.active)
    .filter((mood) => [mood.labelEn, mood.labelAr, mood.slug]
      .some((label) => containsTerm(text, label)))
    .map((mood) => mood.id);
  const requestedLanguage = intents.includes('arabic') && !intents.includes('english')
    ? 'ar'
    : intents.includes('english') && !intents.includes('arabic')
      ? 'en'
      : null;
  const constrained = catalog.filter((track) =>
    (!requestedGenres.length ||
      (track.genreIds?.length ? track.genreIds : [track.genreId])
        .some((genreId) => requestedGenres.includes(genreId))) &&
    (!requestedMoods.length ||
      track.moodIds.some((moodId) => requestedMoods.includes(moodId))) &&
    (!requestedLanguage || track.languageCode === requestedLanguage)
  );
  const ranked = constrained
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
      const reasons: DiscoveryMatchReason[] = [];
      const addReason = (kind: DiscoveryMatchReason['kind'], value: string) => {
        if (!reasons.some((reason) => reason.kind === kind && reason.value === value))
          reasons.push({ kind, value });
      };
      for (const word of tokens) {
        if (containsTerm(genreText, word)) {
          score += 6;
          for (const genre of genres) {
            if (containsTerm(genre.labelEn + ' ' + genre.labelAr + ' ' + genre.slug, word))
              addReason('genre', genre.labelEn);
          }
        }
        if (containsTerm(moodText, word)) {
          score += 6;
          for (const mood of moods) {
            if (containsTerm(mood.labelEn + ' ' + mood.labelAr + ' ' + mood.slug, word))
              addReason('mood', mood.labelEn);
          }
        }
        if (containsTerm(artistText, word)) { score += 4; addReason('artist', artistText); }
        if (containsTerm(track.title, word)) { score += 2; addReason('title', track.title); }
      }
      for (const intent of intents) {
        const terms = synonyms[intent] ?? [];
        if (intent === 'arabic' && track.languageCode === 'ar') {
          score += 6; addReason('language', 'ar');
        }
        if (intent === 'english' && track.languageCode === 'en') {
          score += 6; addReason('language', 'en');
        }
        for (const genre of genres) {
          if (terms.some((term) => containsTerm(genre.labelEn + ' ' + genre.labelAr + ' ' + genre.slug, term))) {
            score += 5; addReason('genre', genre.labelEn);
          }
        }
        for (const mood of moods) {
          if (terms.some((term) => containsTerm(mood.labelEn + ' ' + mood.labelAr + ' ' + mood.slug, term))) {
            score += 5; addReason('mood', mood.labelEn);
          }
        }
      }
      return { track, score, reasons: reasons.slice(0, 4) };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.track.qualifiedPlays - a.track.qualifiedPlays ||
        a.track.id.localeCompare(b.track.id),
    );
  const matched = ranked.some((item) => item.score > 0);
  // Do not claim that a completely unrecognized prompt has been interpreted.
  if (!matched) return { tracks: [], matched: false, reasons: {} };
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
  const reasons = Object.fromEntries(selected.map((track) => [
    track.id, scored.find((item) => item.track.id === track.id)?.reasons ?? [],
  ]));
  return { tracks: selected, matched, reasons };
}
