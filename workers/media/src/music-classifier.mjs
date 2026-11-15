import { compareFingerprints } from './audio-fingerprint.mjs';

/**
 * Tiny offline nearest-neighbor model from CONSENTED, ARTIST-REVIEWED
 * exemplars. No pretrained dataset or user uploads are bundled with Oddio.
 * It abstains unless independent leave-one-out validation passes.
 *
 * Labels are editorial slugs; the model only makes suggestions, never edits
 * artists' Genre/Mood selections. The same rhythm alone is not sufficient.
 */
const MIN_PER_GENRE = 4;
const MIN_GENRES = 2;
const MIN_MACRO_RECALL = 0.7;

function legalExample(row) {
  return row && row.consent === true && row.artistReviewed === true
    && typeof row.genreSlug === 'string' && /^[a-z0-9-]{2,64}$/.test(row.genreSlug)
    && Array.isArray(row.moodSlugs) && row.moodSlugs.length <= 5
    && row.moodSlugs.every((m) => typeof m === 'string' && /^[a-z0-9-]{2,64}$/.test(m))
    && row.fingerprint?.version === 1
    && Array.isArray(row.fingerprint.shingles)
    && row.fingerprint.shingles.length >= 8;
}

function candidates(target, examples, excludeId = null) {
  const ranked = examples
    .filter((item) => item.id !== excludeId)
    .map((item) => ({
      ...item,
      similarity: compareFingerprints(target, item.fingerprint).similarity,
    }))
    .sort((a, b) => b.similarity - a.similarity);
  return ranked;
}

function choose(target, examples, excludeId = null) {
  const nearby = candidates(target, examples, excludeId);
  if (nearby.length < 3) return null;
  // Need multiple distinct, sufficiently similar artist-approved examples,
  // not one repeated track or a generic beat.
  const top = nearby.filter((row) => row.similarity >= 0.55).slice(0, 5);
  if (top.length < 3) return null;
  const votes = new Map();
  for (const row of top) {
    const state = votes.get(row.genreSlug) ?? { weight: 0, count: 0, moods: new Map() };
    state.weight += row.similarity;
    state.count++;
    for (const mood of row.moodSlugs) {
      state.moods.set(mood, (state.moods.get(mood) ?? 0) + row.similarity);
    }
    votes.set(row.genreSlug, state);
  }
  const ranked = [...votes].sort((a, b) => b[1].weight - a[1].weight);
  const winner = ranked[0];
  if (!winner || winner[1].count < 3) return null;
  const total = top.reduce((sum, row) => sum + row.similarity, 0);
  const share = winner[1].weight / total;
  if (share < 0.75 || winner[1].weight - (ranked[1]?.[1].weight ?? 0) < 1) return null;
  const moodSlugs = [...winner[1].moods]
    .filter(([, weight]) => weight / winner[1].weight >= 0.7)
    .map(([mood]) => mood)
    .slice(0, 3);
  return {
    genreSlug: winner[0],
    moodSlugs,
    confidence: Math.round(Math.min(0.99, share * (top[0].similarity ?? 0)) * 100) / 100,
    evidenceCount: winner[1].count,
  };
}

export function trainReviewedClassifier(rows) {
  if (!Array.isArray(rows)) throw new Error('Expected reviewed examples array');
  if (rows.some((row) => !legalExample(row))) {
    throw new Error('Every example needs consent, artist review, genre, moods and fingerprint');
  }
  const examples = rows.map((row, i) => ({
    id: String(row.id ?? i),
    genreSlug: row.genreSlug,
    moodSlugs: [...new Set(row.moodSlugs)],
    fingerprint: row.fingerprint,
  }));
  if (new Set(examples.map((row) => row.id)).size !== examples.length) {
    throw new Error('Duplicate example ids not allowed');
  }
  const counts = new Map();
  for (const row of examples) counts.set(row.genreSlug, (counts.get(row.genreSlug) ?? 0) + 1);
  if (counts.size < MIN_GENRES || [...counts.values()].some((count) => count < MIN_PER_GENRE)) {
    throw new Error('Needs at least two genres with four reviewed tracks in each');
  }
  const perClass = new Map([...counts.keys()].map((slug) => [slug, { correct: 0, total: 0, covered: 0 }]));
  for (const row of examples) {
    const evaluation = choose(row.fingerprint, examples, row.id);
    const stats = perClass.get(row.genreSlug);
    stats.total++;
    if (evaluation) stats.covered++;
    if (evaluation?.genreSlug === row.genreSlug) stats.correct++;
  }
  // Abstentions are counted as misses, preventing inflated precision.
  const macroRecall = [...perClass.values()].reduce(
    (sum, item) => sum + item.correct / item.total, 0) / counts.size;
  const coverage = [...perClass.values()].reduce((sum, item) => sum + item.covered, 0) / examples.length;
  if (macroRecall < MIN_MACRO_RECALL || coverage < 0.65) {
    throw new Error(`Classifier did not meet offline validation: recall=${macroRecall.toFixed(2)} coverage=${coverage.toFixed(2)}`);
  }
  return {
    schemaVersion: 1,
    trainedFromArtistReviewed: true,
    metrics: { macroRecall, coverage, examples: examples.length, genres: counts.size },
    examples,
  };
}

export function suggestArtistTags(fingerprint, model) {
  if (!fingerprint || model?.schemaVersion !== 1 || model.trainedFromArtistReviewed !== true
    || !Array.isArray(model.examples) || !model.metrics
    || model.metrics.macroRecall < MIN_MACRO_RECALL || model.metrics.coverage < 0.65) {
    return null;
  }
  const match = choose(fingerprint, model.examples);
  return match ? { ...match, source: 'artist-reviewed-local-model-v1' } : null;
}
