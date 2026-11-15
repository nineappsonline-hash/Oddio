import { compareFingerprints } from './audio-fingerprint.mjs';

export const HELDOUT_GATES = Object.freeze({
  minGenres: 2,
  minTracksPerGenre: 4,
  minArtistsPerGenre: 4,
  minCoverage: 0.65,
  minMacroRecall: 0.7,
  minPrecision: 0.8,
});

/**
 * A recorded permission reference is required for every real-audio example.
 * Consent can be withdrawn by deleting the reference from the reviewed
 * dataset and rebuilding the model; this is NOT a public opt-in flag.
 */
export function validateReviewedRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No reviewed rows supplied');
  const ids = new Set();
  const fingerprints = new Set();
  for (const row of rows) {
    if (row?.rightsBasis !== 'original_creator'
      && row?.rightsBasis !== 'licensed_for_training') {
      throw new Error('Audio training requires an explicitly documented rights basis');
    }
    if (row?.consentScope !== 'local_audio_feature_training') {
      throw new Error('Consent scope must explicitly cover local music model training');
    }
    if (row?.consent !== true || row.artistReviewed !== true
      || typeof row.consentRef !== 'string' || row.consentRef.trim().length < 8
      || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(row.consentedAt ?? '')
      || typeof row.id !== 'string' || row.id.length < 1
      || typeof row.artistId !== 'string' || row.artistId.length < 3
      || !/^[a-z0-9-]{2,64}$/.test(row.genreSlug ?? '')
      || !Array.isArray(row.moodSlugs) || row.moodSlugs.length > 5
      || row.moodSlugs.some((m) => typeof m !== 'string' || !/^[a-z0-9-]{2,64}$/.test(m))
      || row.fingerprint?.version !== 1
      || !Array.isArray(row.fingerprint.shingles)
      || row.fingerprint.shingles.length < 8) {
      throw new Error('Missing recorded consent, artist review, valid labels or audio fingerprint');
    }
    const date = new Date(row.consentedAt);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== row.consentedAt
      || date.getTime() > Date.now()) throw new Error('Invalid permission timestamp');
    if (ids.has(row.id)) throw new Error('Repeated example id across dataset');
    ids.add(row.id);
    const fingerprintKey = JSON.stringify([...new Set(row.fingerprint.shingles)].sort());
    if (fingerprints.has(fingerprintKey)) throw new Error('Duplicated audio fingerprint across dataset');
    fingerprints.add(fingerprintKey);
  }
  return rows;
}

export function evaluateHeldoutModel(model, holdout, predictReviewedTags) {
  if (typeof predictReviewedTags !== 'function') throw new Error('Expected classifier predictor');
  validateReviewedRows(holdout);
  if (model?.schemaVersion !== 1 || !Array.isArray(model.examples)
    || !model.trainedFromArtistReviewed) throw new Error('Invalid trained model');
  const trainingArtists = new Set(model.examples.map((x) => x.artistId));
  const trainingIds = new Set(model.examples.map((x) => x.id));
  const trainingFingerprints = new Set(model.examples.map((x) =>
    JSON.stringify([...new Set(x.fingerprint.shingles)].sort())));
  const genreRows = new Map();
  const predictedRows = new Map();
  const stats = {
    examples: holdout.length,
    covered: 0,
    correct: 0,
    moodTruePositive: 0,
    moodFalsePositive: 0,
    moodFalseNegative: 0,
  };

  // Important: import the same prediction implementation used by the worker,
  // not a duplicate heuristic tuned to the holdout labels.
  for (const row of holdout) {
    if (trainingArtists.has(row.artistId) || trainingIds.has(row.id)
      || trainingFingerprints.has(JSON.stringify([...new Set(row.fingerprint.shingles)].sort()))) {
      throw new Error('Train/holdout leakage: repeated artist, track or audio');
    }
    const actual = genreRows.get(row.genreSlug) ?? { total: 0, correct: 0, covered: 0, artists: new Set() };
    actual.total++;
    actual.artists.add(row.artistId);
    genreRows.set(row.genreSlug, actual);
    const guess = predictReviewedTags(row.fingerprint, model);
    if (!guess) continue;
    stats.covered++;
    actual.covered++;
    const predicted = predictedRows.get(guess.genreSlug) ?? { predicted: 0, correct: 0 };
    predicted.predicted++;
    if (guess.genreSlug === row.genreSlug) {
      stats.correct++;
      actual.correct++;
      predicted.correct++;
    }
    predictedRows.set(guess.genreSlug, predicted);
    const truthMoods = new Set(row.moodSlugs);
    const guessedMoods = new Set(guess.moodSlugs);
    for (const mood of guessedMoods) {
      if (truthMoods.has(mood)) stats.moodTruePositive++;
      else stats.moodFalsePositive++;
    }
    for (const mood of truthMoods) {
      if (!guessedMoods.has(mood)) stats.moodFalseNegative++;
    }
  }
  const genres = [...genreRows.entries()];
  const trainedGenres = new Set(model.examples.map((row) => row.genreSlug));
  if (genres.length !== trainedGenres.size
    || genres.some(([genre]) => !trainedGenres.has(genre))) {
    throw new Error('Held-out validation must cover every trained genre, without extra labels');
  }
  if (genres.length < HELDOUT_GATES.minGenres
    || genres.some(([, s]) => s.total < HELDOUT_GATES.minTracksPerGenre
      || s.artists.size < HELDOUT_GATES.minArtistsPerGenre)) {
    throw new Error('Held-out set needs two genres, four tracks and four new artists per genre');
  }
  const recallByGenre = Object.fromEntries(genres.map(([genre, s]) => [
    genre, { recall: s.correct / s.total, coverage: s.covered / s.total, count: s.total },
  ]));
  const precisionByGenre = Object.fromEntries([...predictedRows].map(([genre, s]) => [
    genre, { precision: s.correct / s.predicted, predicted: s.predicted },
  ]));
  const macroRecall = genres.reduce((sum, [, s]) => sum + s.correct / s.total, 0) / genres.length;
  // Count abstentions as misses for recall; never inflate confidence.
  const coverage = stats.covered / stats.examples;
  const precision = stats.covered ? stats.correct / stats.covered : 0;
  const moodPrecision = stats.moodTruePositive + stats.moodFalsePositive
    ? stats.moodTruePositive / (stats.moodTruePositive + stats.moodFalsePositive) : 0;
  const moodRecall = stats.moodTruePositive + stats.moodFalseNegative
    ? stats.moodTruePositive / (stats.moodTruePositive + stats.moodFalseNegative) : 0;
  const passed = coverage >= HELDOUT_GATES.minCoverage
    && macroRecall >= HELDOUT_GATES.minMacroRecall
    && precision >= HELDOUT_GATES.minPrecision
    && moodPrecision >= 0.7
    && moodRecall >= 0.6
    && Object.values(recallByGenre).every((s) => s.recall >= 0.5);
  return {
    passed,
    metrics: {
      ...stats, coverage, macroRecall, precision,
      moodPrecision, moodRecall, recallByGenre, precisionByGenre,
    },
    gates: HELDOUT_GATES,
  };
}

