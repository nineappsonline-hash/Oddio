#!/usr/bin/env node
/**
 * Generate short royalty-free demo audio so the streaming pipeline works
 * without shipping binary assets in the repository. Requires ffmpeg.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'apps', 'web', '.data', 'seed-audio');
const force = process.argv.includes('--force');

// Durations must stay in sync with the durationMs values in
// apps/web/src/lib/data/seed.ts for the matching audioIndex.
const tracks = [
  { file: 'track-1.mp3', duration: 214, freqs: [220.0, 277.18, 329.63] },
  { file: 'track-2.mp3', duration: 268, freqs: [174.61, 220.0, 261.63] },
  { file: 'track-3.mp3', duration: 198, freqs: [196.0, 246.94, 293.66] },
  { file: 'track-4.mp3', duration: 226, freqs: [146.83, 185.0, 220.0] },
  { file: 'track-5.mp3', duration: 241, freqs: [261.63, 311.13, 392.0] },
  { file: 'track-6.mp3', duration: 205, freqs: [110.0, 164.81, 220.0] },
];

function hasFfmpeg() {
  const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  return result.status === 0;
}

function existingDuration(target) {
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', target],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  const seconds = Number.parseFloat(result.stdout.trim());
  return Number.isFinite(seconds) ? seconds : null;
}

if (!hasFfmpeg()) {
  console.error('ffmpeg is required. Install it and rerun: npm run setup:demo');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

for (const track of tracks) {
  const target = path.join(outDir, track.file);
  const current = fs.existsSync(target) ? existingDuration(target) : null;
  if (!force && current !== null && Math.abs(current - track.duration) < 1.5) {
    console.log(`skip ${track.file} (duration ok)`);
    continue;
  }
  const duration = track.duration;
  const inputs = track.freqs.flatMap((freq) => [
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=${freq}:duration=${duration}:sample_rate=44100`,
  ]);
  const filter = [
    `[0:a][1:a][2:a]amix=inputs=3:duration=longest:normalize=0`,
    'volume=0.18',
    'afade=t=in:st=0:d=2',
    `afade=t=out:st=${duration - 3}:d=3`,
  ].join(',');
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      ...inputs,
      '-filter_complex',
      filter,
      '-c:a',
      'libmp3lame',
      '-b:a',
      '320k',
      '-ar',
      '44100',
      '-ac',
      '2',
      target,
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) {
    console.error(`failed to generate ${track.file}`);
    process.exit(1);
  }
  console.log(`wrote ${path.relative(root, target)}`);
}

console.log(
  '\nDemo audio ready. Run npm run dev and log in with listener@demo.local / demo1234.',
);
