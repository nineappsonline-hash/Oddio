#!/usr/bin/env node
/**
 * Run locally on songs you have explicit permission to use for model training.
 * This script NEVER uploads audio, includes filenames in the output, guesses
 * genres, or changes the Oddio artist catalog.
 *
 * Manifest JSON array entry:
 * {id,artistId,filePath,genreSlug,moodSlugs,consent:true,
 *  artistReviewed:true,rightsBasis:"original_creator",
 *  consentScope:"local_audio_feature_training",
 *  consentRef:"private-consent-2026-001",consentedAt:"2026-01-01T00:00:00.000Z"}
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import { fingerprintPcm16 } from '../workers/media/src/audio-fingerprint.mjs';
import { validateReviewedRows } from '../workers/media/src/heldout-evaluation.mjs';

const exec = promisify(execFile);
const manifest = process.argv[2];
const outputAt = process.argv.indexOf('--output');
const output = outputAt > 0 ? process.argv[outputAt + 1] : null;
if (!manifest || !output || output.startsWith('--')) {
  process.stderr.write('Usage: node scripts/prepare-music-dataset.mjs approved-manifest.json --output /private/reviewed.json\n');
  process.exit(2);
}
try {
  const rows = JSON.parse(await fs.readFile(manifest, 'utf8'));
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 10000) {
    throw new Error('Expected 1..10000 manifest entries');
  }
  const prepared = [];
  for (const row of rows) {
    if (typeof row.filePath !== 'string' || !row.filePath) {
      throw new Error('Local audio file path is required');
    }
    // Validate all human declarations before touching any audio file.
    const permissions = { ...row, fingerprint: { version: 1, shingles: Array(8).fill('not-an-audio-fingerprint') } };
    validateReviewedRows([permissions]);
    const stats = await fs.stat(row.filePath);
    if (!stats.isFile() || stats.size < 1000 || stats.size > 300 * 1024 * 1024) {
      throw new Error('Local audio must be a nonempty regular file under 300 MiB');
    }
    const { stdout } = await exec('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-i', row.filePath,
      '-map', '0:a:0', '-t', '90', '-ar', '11025', '-ac', '1',
      '-f', 's16le', 'pipe:1',
    ], { encoding: 'buffer', timeout: 60_000, maxBuffer: 3 * 1024 * 1024 });
    const fingerprint = fingerprintPcm16(stdout, 11025);
    if (!fingerprint) throw new Error('Audio too short, silent or insufficiently distinctive');
    const { filePath: _privatePath, ...meta } = row;
    prepared.push({ ...meta, fingerprint });
  }
  validateReviewedRows(prepared);
  await fs.writeFile(output, JSON.stringify(prepared, null, 2), {
    flag: 'wx', mode: 0o600,
  });
  process.stdout.write(JSON.stringify({ prepared: prepared.length, localOnly: true }) + '\n');
} catch (error) {
  // Do not print local filenames or consent identifiers in errors.
  process.stderr.write(`Dataset preparation blocked: ${error instanceof Error ? error.message : 'invalid_input'}\n`);
  process.exitCode = 1;
}
