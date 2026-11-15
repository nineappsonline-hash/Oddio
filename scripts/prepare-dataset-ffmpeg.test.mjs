import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('private approved audio becomes a fingerprint, never a copied recording or path', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'oddio-permission-'));
  try {
    const rate = 11025;
    const seconds = 22;
    const source = Buffer.alloc(rate * seconds * 2);
    for (let i = 0; i < rate * seconds; i++) {
      const time = i / rate;
      const note = Math.floor(time * 2.3) % 9;
      const frequency = 180 + 43 * note * note;
      const value = 0.38 * Math.sin(2 * Math.PI * frequency * time);
      source.writeInt16LE(Math.round(value * 32767), i * 2);
    }
    const sourceFile = path.join(directory, 'synthetic.pcm');
    const audio = path.join(directory, 'synthetic.mp3');
    const manifestFile = path.join(directory, 'consented-manifest.json');
    const preparedFile = path.join(directory, 'features.json');
    writeFileSync(sourceFile, source);
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
        sourceFile,
        '-c:a',
        'libmp3lame',
        '-b:a',
        '128k',
        audio,
      ],
      { timeout: 30000 },
    );
    const manifest = [
      {
        id: 'fixture-1',
        artistId: 'fixture-artist',
        filePath: audio,
        consent: true,
        artistReviewed: true,
        rightsBasis: 'original_creator',
        consentScope: 'local_audio_feature_training',
        consentRef: 'synthetic-fixture-not-real-permission',
        consentedAt: '2026-01-01T00:00:00.000Z',
        genreSlug: 'ambient',
        moodSlugs: ['calm'],
      },
    ];
    writeFileSync(manifestFile, JSON.stringify(manifest));
    const cli = path.resolve('scripts/prepare-music-dataset.mjs');
    const generated = spawnSync(process.execPath, [
      cli,
      manifestFile,
      '--output',
      preparedFile,
    ]);
    assert.equal(generated.status, 0, generated.stderr.toString());
    const output = readFileSync(preparedFile, 'utf8');
    const rows = JSON.parse(output);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'fixture-1');
    assert.ok(rows[0].fingerprint.shingles.length >= 8);
    assert.equal('filePath' in rows[0], false);
    assert.equal(output.includes(audio), false);
    assert.equal(output.includes('synthetic.pcm'), false);

    // Withdraw the synthetic fixture's permission and ensure no output file
    // is ever generated. No real user audio is involved in this test.
    manifest[0].consent = false;
    writeFileSync(manifestFile, JSON.stringify(manifest));
    const refusedPath = path.join(directory, 'refused.json');
    const refused = spawnSync(process.execPath, [
      cli,
      manifestFile,
      '--output',
      refusedPath,
    ]);
    assert.notEqual(refused.status, 0);
    assert.equal(existsSync(refusedPath), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
