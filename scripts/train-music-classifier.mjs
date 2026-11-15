#!/usr/bin/env node
/**
 * Offline training from consented, artist-reviewed fingerprints.
 * No audio file or label is sent to a third party. Output is deliberately
 * generated only with explicit --output, never into production by default.
 */
import fs from 'node:fs/promises';
import { trainReviewedClassifier } from '../workers/media/src/music-classifier.mjs';

const input = process.argv[2];
const outputFlag = process.argv.indexOf('--output');
const output = outputFlag > 0 ? process.argv[outputFlag + 1] : null;
if (!input || !output || output.startsWith('--')) {
  process.stderr.write(
    'Usage: node scripts/train-music-classifier.mjs reviewed-examples.json --output /safe/path/model.json\n',
  );
  process.exit(2);
}
try {
  const rows = JSON.parse(await fs.readFile(input, 'utf8'));
  const model = trainReviewedClassifier(rows);
  await fs.writeFile(output, JSON.stringify(model, null, 2), { flag: 'wx', mode: 0o600 });
  process.stdout.write(
    JSON.stringify({ outputCreated: true, metrics: model.metrics }) + '\n',
  );
} catch (error) {
  process.stderr.write(
    `Local training blocked: ${error instanceof Error ? error.message : 'invalid_data'}\n`,
  );
  process.exitCode = 1;
}
