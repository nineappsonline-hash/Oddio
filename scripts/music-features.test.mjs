import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePcm16 } from '../workers/media/src/music-features.mjs';

const sampleRate = 11025;
function synthetic({ seconds = 20, bpm = 120, amplitude = 0.7 } = {}) {
  const frames = sampleRate * seconds;
  const audio = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i++) {
    const position = i / sampleRate;
    const beat = 60 / bpm;
    const phase = position % beat;
    const click = phase < 0.015 ? amplitude * Math.sin(2 * Math.PI * 800 * position) : 0;
    audio.writeInt16LE(Math.round(Math.max(-1, Math.min(1, click)) * 32767), i * 2);
  }
  return audio;
}

test('silence and very short clips do not produce invented BPM', () => {
  const silence = analyzePcm16(Buffer.alloc(sampleRate * 20 * 2), sampleRate);
  assert.equal(silence.tempoBpm, null);
  assert.equal(silence.tempoConfidence, 0);
  assert.equal(silence.rmsDbfs, -120);
  assert.equal(analyzePcm16(Buffer.alloc(100), sampleRate).tempoBpm, null);
});

test('reports RMS, peak and bounded confidence on a rhythmic 120 BPM signal', () => {
  const result = analyzePcm16(synthetic({ bpm: 120 }), sampleRate);
  assert.ok(result.rmsDbfs < 0);
  assert.ok(result.peakDbfs <= 0);
  assert.ok(result.tempoConfidence >= 0 && result.tempoConfidence <= 1);
  assert.ok(result.tempoBpm !== null, 'expected a strong periodic tempo signal');
  assert.ok(Math.abs(result.tempoBpm - 120) <= 3,
    `expected roughly 120 BPM, got ${result.tempoBpm}`);
});

test('rejects malformed PCM and invalid sampling configuration', () => {
  assert.throws(() => analyzePcm16(Buffer.alloc(5)));
  assert.throws(() => analyzePcm16(Buffer.alloc(2), 0));
});
