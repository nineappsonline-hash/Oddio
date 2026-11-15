import assert from 'node:assert/strict';
import test from 'node:test';
import { fingerprintPcm16, compareFingerprints } from '../workers/media/src/audio-fingerprint.mjs';

const rate = 11025;
function render({ seconds = 24, gain = 0.5, offset = 0, transpose = 1 } = {}) {
  const result = Buffer.alloc(seconds * rate * 2);
  for (let index = 0; index < seconds * rate; index++) {
    const t = index / rate - offset;
    const note = t > 0 ? Math.floor(t * 2.3) % 9 : 0;
    const freq = (180 + note * note * 43) * transpose;
    const val = t > 0
      ? gain * (0.75 * Math.sin(2 * Math.PI * freq * t)
        + 0.25 * Math.sin(2 * Math.PI * (freq * 1.49) * t))
      : 0;
    result.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(val * 32767))), index * 2);
  }
  return result;
}

test('detects same arrangement at different volume without exact bytes', () => {
  const original = fingerprintPcm16(render());
  const lowerVolume = fingerprintPcm16(render({ gain: 0.13 }));
  assert.ok(original);
  assert.ok(lowerVolume);
  const comparison = compareFingerprints(original, lowerVolume);
  assert.ok(comparison.similarity >= 0.8, JSON.stringify(comparison));
  assert.equal(comparison.candidate, true);
});

test('does not claim an unrelated pitch-shifted melody is identical', () => {
  const original = fingerprintPcm16(render());
  const unrelated = fingerprintPcm16(render({ transpose: 2.05 }));
  const comparison = compareFingerprints(original, unrelated);
  assert.equal(comparison.candidate, false);
});

test('rejects silence and short clips instead of inventing fingerprints', () => {
  assert.equal(fingerprintPcm16(Buffer.alloc(rate * 22 * 2)), null);
  assert.equal(fingerprintPcm16(Buffer.alloc(rate * 3 * 2)), null);
  assert.deepEqual(compareFingerprints(null, null), { similarity: 0, candidate: false });
});
