import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  fingerprintPcm16,
  compareFingerprints,
} from '../workers/media/src/audio-fingerprint.mjs';

test('real MP3 encode/decode remains a review candidate, not a copyright verdict', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'oddio-spectral-'));
  try {
    const rate = 11025;
    const buffer = Buffer.alloc(rate * 26 * 2);
    for (let i = 0; i < rate * 26; i++) {
      const t = i / rate;
      const note = Math.floor(t * 2.3) % 9;
      const freq = 180 + note * note * 43;
      const sample =
        0.5 *
        (0.75 * Math.sin(2 * Math.PI * freq * t) +
          0.25 * Math.sin(2 * Math.PI * freq * 1.49 * t));
      buffer.writeInt16LE(Math.round(sample * 32767), 2 * i);
    }
    const pcm = path.join(dir, 'original.pcm');
    const mp3 = path.join(dir, 'reencoded.mp3');
    const decoded = path.join(dir, 'decoded.pcm');
    writeFileSync(pcm, buffer);
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        's16le',
        '-ar',
        String(rate),
        '-ac',
        '1',
        '-i',
        pcm,
        '-ar',
        '44100',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '128k',
        mp3,
      ],
      { timeout: 30000 },
    );
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        mp3,
        '-ar',
        String(rate),
        '-ac',
        '1',
        '-f',
        's16le',
        decoded,
      ],
      { timeout: 30000 },
    );
    const before = fingerprintPcm16(buffer, rate);
    const after = fingerprintPcm16(readFileSync(decoded), rate);
    assert.ok(before && after, 'audio signatures should be nonempty');
    const result = compareFingerprints(before, after);
    assert.equal(result.candidate, true, JSON.stringify(result));
    assert.ok(result.similarity >= 0.82, JSON.stringify(result));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
