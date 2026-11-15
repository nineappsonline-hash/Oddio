#!/usr/bin/env node
/**
 * Offline training from consented, artist-reviewed fingerprints.
 * No audio file or label is sent to a third party. Output is deliberately
 * generated only with explicit --output, never into production by default.
 */
import fs from 'node:fs/promises';
import { trainReviewedClassifier, predictReviewedTags } from '../workers/media/src/music-classifier.mjs';
import { evaluateHeldoutModel, validateReviewedRows } from '../workers/media/src/heldout-evaluation.mjs';

const input = process.argv[2];
const outputFlag = process.argv.indexOf('--output');
const holdoutFlag = process.argv.indexOf('--holdout');
const output = outputFlag > 0 ? process.argv[outputFlag + 1] : null;
const holdoutFile = holdoutFlag > 0 ? process.argv[holdoutFlag + 1] : null;
if (!input || !output || !holdoutFile || output.startsWith('--') || holdoutFile.startsWith('--')) {
  process.stderr.write(
    'Usage: node scripts/train-music-classifier.mjs train.json --holdout heldout.json --output /private/model.json\n',
  );
  process.exit(2);
}
try {
  const rows = validateReviewedRows(JSON.parse(await fs.readFile(input, 'utf8')));
  const holdout = validateReviewedRows(JSON.parse(await fs.readFile(holdoutFile, 'utf8')));
  const model = trainReviewedClassifier(rows);
  const evaluation = evaluateHeldoutModel(model, holdout, predictReviewedTags);
  if (!evaluation.passed) {
    throw new Error(`Heldout validation failed: recall=${evaluation.metrics.macroRecall.toFixed(2)}, precision=${evaluation.metrics.precision.toFixed(2)}, coverage=${evaluation.metrics.coverage.toFixed(2)}`);
  }
  model.heldoutValidation = {
    ...evaluation,
    reviewedAt: new Date().toISOString(),
    // Do not bundle holdout audio or holdout fingerprints in the model.
    trainedArtistCount: new Set(rows.map((row) => row.artistId)).size,
    heldoutArtistCount: new Set(holdout.map((row) => row.artistId)).size,
  };
  await fs.writeFile(output, JSON.stringify(model, null, 2), { flag: 'wx', mode: 0o600 });
  process.stdout.write(
    JSON.stringify({ outputCreated: true, trainingMetrics: model.metrics, heldout: evaluation }) + '\n',
  );
} catch (error) {
  process.stderr.write(
    `Local training blocked: ${error instanceof Error ? error.message : 'invalid_data'}\n`,
  );
  process.exitCode = 1;
}
