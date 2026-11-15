import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

function syntheticFixture(split, genre, index) {
  const id = `${split}-${genre}-${index}`;
  return {
    id,
    artistId: `${split}-artist-${genre}-${index}`,
    consent: true,
    artistReviewed: true,
    // TEST FIXTURES ONLY: these are not real consent records or real tracks.
    rightsBasis: 'original_creator',
    consentScope: 'local_audio_feature_training',
    consentRef: `test-consent-not-real-${id}`,
    consentedAt: '2026-01-01T00:00:00.000Z',
    genreSlug: genre,
    moodSlugs: genre === 'ambient' ? ['calm'] : ['energetic'],
    fingerprint: {
      version: 1,
      shingles: [
        ...Array.from({ length: 25 }, (_, i) => `${genre}-dummy-${i}`),
        `unique-${id}`,
      ],
    },
  };
}

test('offline release CLI refuses missing holdout or consent and emits nothing', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'oddio-model-gate-'));
  try {
    const train = [
      ...Array.from({ length: 5 }, (_, i) => syntheticFixture('train', 'ambient', i)),
      ...Array.from({ length: 5 }, (_, i) => syntheticFixture('train', 'electronic', i)),
    ];
    const holdout = [
      ...Array.from({ length: 4 }, (_, i) => syntheticFixture('holdout', 'ambient', i)),
      ...Array.from({ length: 4 }, (_, i) => syntheticFixture('holdout', 'electronic', i)),
    ];
    const trainPath = path.join(directory, 'train.json');
    const holdoutPath = path.join(directory, 'holdout.json');
    const modelPath = path.join(directory, 'reviewed.json');
    const script = path.resolve('scripts/train-music-classifier.mjs');
    writeFileSync(trainPath, JSON.stringify(train));
    writeFileSync(holdoutPath, JSON.stringify(holdout));

    const noHoldout = spawnSync(process.execPath, [script, trainPath, '--output', modelPath]);
    assert.notEqual(noHoldout.status, 0);
    assert.equal(existsSync(modelPath), false);

    writeFileSync(holdoutPath, JSON.stringify([
      { ...holdout[0], consent: false }, ...holdout.slice(1),
    ]));
    const noConsent = spawnSync(process.execPath, [
      script, trainPath, '--holdout', holdoutPath, '--output', modelPath,
    ]);
    assert.notEqual(noConsent.status, 0);
    assert.equal(existsSync(modelPath), false);

    writeFileSync(holdoutPath, JSON.stringify(holdout));
    const accepted = spawnSync(process.execPath, [
      script, trainPath, '--holdout', holdoutPath, '--output', modelPath,
    ]);
    assert.equal(accepted.status, 0, accepted.stderr.toString());
    const model = JSON.parse(readFileSync(modelPath, 'utf8'));
    assert.equal(model.heldoutValidation.passed, true);
    assert.equal(model.heldoutValidation.metrics.examples, 8);
    assert.equal(model.examples.length, 10);
    assert.equal(model.examples.some((row) => 'consentRef' in row), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
