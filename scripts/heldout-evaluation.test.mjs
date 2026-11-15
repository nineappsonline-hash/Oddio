import assert from 'node:assert/strict';
import test from 'node:test';
import {
  trainReviewedClassifier,
  predictReviewedTags,
  suggestArtistTags,
} from '../workers/media/src/music-classifier.mjs';
import {
  validateReviewedRows,
  evaluateHeldoutModel,
} from '../workers/media/src/heldout-evaluation.mjs';

function reviewed(genreSlug, artistNo, split) {
  const id = `${split}-${genreSlug}-${artistNo}`;
  return {
    id,
    artistId: `${split}-artist-${genreSlug}-${artistNo}`,
    consent: true,
    artistReviewed: true,
    rightsBasis: 'original_creator',
    consentScope: 'local_audio_feature_training',
    consentRef: `written-permission-${id}`,
    consentedAt: '2026-01-01T00:00:00.000Z',
    genreSlug,
    moodSlugs: genreSlug === 'ambient' ? ['calm'] : ['energetic'],
    fingerprint: {
      version: 1,
      shingles: [
        ...Array.from({ length: 30 }, (_, i) => `${genreSlug}-spectral-${i}`),
        `unique-${id}`,
      ],
    },
  };
}
const training = [
  ...Array.from({ length: 6 }, (_, i) => reviewed('ambient', i, 'training')),
  ...Array.from({ length: 6 }, (_, i) => reviewed('electronic', i, 'training')),
];
const holdout = [
  ...Array.from({ length: 4 }, (_, i) => reviewed('ambient', i, 'holdout')),
  ...Array.from({ length: 4 }, (_, i) => reviewed('electronic', i, 'holdout')),
];

test('independent artists and recordings validate, then unlock predictions', () => {
  const model = trainReviewedClassifier(validateReviewedRows(training));
  assert.equal(suggestArtistTags(holdout[0].fingerprint, model), null);
  const evaluation = evaluateHeldoutModel(
    model,
    validateReviewedRows(holdout),
    predictReviewedTags,
  );
  assert.equal(evaluation.passed, true);
  assert.equal(evaluation.metrics.coverage, 1);
  assert.equal(evaluation.metrics.macroRecall, 1);
  assert.equal(evaluation.metrics.precision, 1);
  assert.equal(evaluation.metrics.moodRecall, 1);
  model.heldoutValidation = evaluation;
  assert.equal(suggestArtistTags(holdout[0].fingerprint, model)?.genreSlug, 'ambient');
});

test('explicit rights and verified consent scope are mandatory', () => {
  assert.throws(
    () => validateReviewedRows([{ ...training[0], consent: false }]),
    /consent/i,
  );
  assert.throws(
    () => validateReviewedRows([{ ...training[0], rightsBasis: 'unknown' }]),
    /rights basis/i,
  );
  assert.throws(
    () => validateReviewedRows([{ ...training[0], consentScope: 'public_streaming' }]),
    /Consent scope/i,
  );
  assert.throws(
    () => validateReviewedRows([{ ...training[0], consentRef: '' }]),
    /consent/i,
  );
});

test('held-out artist and fingerprint leakage are rejected before scoring', () => {
  const model = trainReviewedClassifier(validateReviewedRows(training));
  assert.throws(
    () =>
      evaluateHeldoutModel(
        model,
        [{ ...holdout[0], artistId: training[0].artistId }, ...holdout.slice(1)],
        predictReviewedTags,
      ),
    /leakage/i,
  );
  assert.throws(
    () =>
      evaluateHeldoutModel(
        model,
        [{ ...holdout[0], fingerprint: training[0].fingerprint }, ...holdout.slice(1)],
        predictReviewedTags,
      ),
    /leakage/i,
  );
});

test('inadequate representation and poor predictions cannot pass deployment gate', () => {
  const model = trainReviewedClassifier(validateReviewedRows(training));
  assert.throws(
    () => evaluateHeldoutModel(model, holdout.slice(0, 3), predictReviewedTags),
    /Held-out set needs|Held-out validation must cover/i,
  );
  const degraded = holdout.map((row) => ({
    ...row,
    fingerprint: {
      version: 1,
      shingles: [
        ...Array.from({ length: 30 }, (_, i) => `unrelated-${row.id}-${i}`),
        `unique-${row.id}`,
      ],
    },
  }));
  const failed = evaluateHeldoutModel(model, degraded, predictReviewedTags);
  assert.equal(failed.passed, false);
  assert.equal(failed.metrics.coverage, 0);
  assert.equal(
    suggestArtistTags(holdout[0].fingerprint, {
      ...model,
      heldoutValidation: failed,
    }),
    null,
  );
});
