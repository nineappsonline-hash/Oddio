#!/usr/bin/env node
/**
 * Local, zero-API music feature preview. This command only reads the provided
 * file and prints descriptive measurements. It never changes the artist's
 * declared genre, mood, publishing rights, or source media.
 *
 * Example: node scripts/analyze-audio.mjs /path/to/a-song.mp3
 * Requires local ffmpeg/ffprobe, already used by Oddio media processing.
 */
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { promisify } from 'node:util';
import { analyzePcm16 } from '../workers/media/src/music-features.mjs';

const exec = promisify(execFile);
const filename = process.argv[2];
if (!filename || filename.startsWith('--')) {
  process.stderr.write(
    'Usage: node scripts/analyze-audio.mjs <locally-owned-audio-file>\n',
  );
  process.exit(2);
}

try {
  const stat = await fs.promises.stat(filename);
  if (!stat.isFile() || stat.size === 0 || stat.size > 300 * 1024 * 1024) {
    throw new Error('Expected a regular audio file (at most 300 MiB)');
  }
  const hash = crypto.createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filename);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  const sampleRate = 11025;
  const { stdout } = await exec(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      filename,
      '-map',
      '0:a:0',
      '-t',
      '90',
      '-ac',
      '1',
      '-ar',
      String(sampleRate),
      '-f',
      's16le',
      'pipe:1',
    ],
    {
      encoding: 'buffer',
      timeout: 45_000,
      maxBuffer: 3 * 1024 * 1024,
    },
  );
  const analysis = analyzePcm16(stdout, sampleRate);
  process.stdout.write(
    JSON.stringify(
      {
        schemaVersion: 1,
        fileSha256: hash.digest('hex'),
        ...analysis,
        measurement: 'first 90 seconds at most, mono PCM',
        bpmDisclaimer:
          'Approximate: half/double-tempo ambiguity, no genre/mood inference',
      },
      null,
      2,
    ) + '\n',
  );
} catch (error) {
  // Local paths / credentials are not printed in failures.
  process.stderr.write(
    `Could not analyze local audio: ${error instanceof Error ? error.name : 'error'}\n`,
  );
  process.exitCode = 1;
}
