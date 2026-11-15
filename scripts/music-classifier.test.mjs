import assert from 'node:assert/strict';
import test from 'node:test';
import { trainReviewedClassifier, suggestArtistTags } from '../workers/media/src/music-classifier.mjs';

function example(id, genreSlug, prefix) {
  return {
    id,
    genreSlug,
    moodSlugs: genreSlug === 'ambient' ? ['calm'] : ['energetic'],
    consent: true,
    artistReviewed: true,
    fingerprint: {
      version: 1,
      shingles: Array.from({ length: 25 }, (_, i) => `${prefix}-${i}`),
    },
  };
}
const good = [
  ...Array.from({ length: 5 }, (_, i) => example(`amb-${i}`, 'ambient', 'ambient')),
  ...Array.from({ length: 5 }, (_, i) => example(`elec-${i}`, 'electronic', 'electronic')),
];

test('trained local examples can suggest genres and moods without any paid API', () => {
  const model = trainReviewedClassifier(good);
  assert.equal(model.metrics.macroRecall, 1);
  const suggestion = suggestArtistTags(good[0].fingerprint, model);
  assert.equal(suggestion?.genreSlug, 'ambient');
  assert.deepEqual(suggestion?.moodSlugs, ['calm']);
  assert.equal(suggestion?.source, 'artist-reviewed-local-model-v1');
});

test('requires consent and artist review, and abstains when audio evidence is absent', () => {
  assert.throws(() => trainReviewedClassifier([
    ...good.slice(0, 9), { ...good[9], consent: false },
  ]), /consent/);
  const model = trainReviewedClassifier(good);
  assert.equal(suggestArtistTags({ version: 1, shingles: ['unrelated'] }, model), null);
  assert.equal(suggestArtistTags(good[0].fingerprint, null), null);
});

test('rejects uncalibrated, underrepresented or duplicate-id models', () => {
  assert.throws(() => trainReviewedClassifier(good.slice(0, 6)), /at least two genres/);
  assert.throws(() => trainReviewedClassifier([
    ...good.slice(0, 9), { ...good[9], id: good[0].id },
  ]), /Duplicate example ids/);
  assert.equal(suggestArtistTags(good[0].fingerprint, {
    schemaVersion: 1, trainedFromArtistReviewed: true,
    metrics: { macroRecall: 0.4, coverage: 1 }, examples: good,
  }), null);
});
