/**
 * Lightweight perceptual screening fingerprint for bounded mono PCM16LE.
 * Unlike SHA-256 it can flag candidate re-encodes and volume changes.
 * It is NOT proof of copyright infringement or song identity.
 */
const BANDS_HZ = [110, 170, 260, 400, 620, 960, 1500, 2300, 3500, 4800];
const FRAME = 1024;
const HOP_SECONDS = 0.25;

export function fingerprintPcm16(buffer, sampleRate = 11025) {
  if (
    !Buffer.isBuffer(buffer) ||
    sampleRate < 8000 ||
    sampleRate > 48000 ||
    buffer.length % 2 !== 0
  )
    throw new Error('Invalid mono PCM16LE');
  const sampleCount = buffer.length / 2;
  if (sampleCount < sampleRate * 8) return null;
  const hop = Math.round(sampleRate * HOP_SECONDS);
  const frameSize = Math.min(FRAME, hop);
  const coefficients = BANDS_HZ.filter((hz) => hz < sampleRate / 2 - 200).map(
    (hz) => 2 * Math.cos((2 * Math.PI * hz) / sampleRate),
  );
  const patterns = [];
  let lastEnergy = 0;
  for (let start = 0; start + frameSize <= sampleCount; start += hop) {
    let energy = 0;
    const q1 = new Float64Array(coefficients.length);
    const q2 = new Float64Array(coefficients.length);
    for (let i = 0; i < frameSize; i++) {
      // Hann window stabilizes fingerprints under codec frame boundaries.
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
      const v = (buffer.readInt16LE((start + i) * 2) / 32768) * w;
      energy += v * v;
      for (let band = 0; band < coefficients.length; band++) {
        const q = v + coefficients[band] * q1[band] - q2[band];
        q2[band] = q1[band];
        q1[band] = q;
      }
    }
    const bands = coefficients.map(
      (coefficient, index) =>
        q1[index] ** 2 + q2[index] ** 2 - coefficient * q1[index] * q2[index],
    );
    const total = bands.reduce((a, b) => a + b, 0);
    // Top two musical-frequency bands, normalized against overall energy.
    const best = bands
      .map((power, index) => ({ index, power }))
      .sort((a, b) => b.power - a.power)
      .slice(0, 2);
    const loud = energy > frameSize * 0.000005;
    patterns.push(
      loud && total > 0 && best.length === 2 ? best[0].index.toString(16) : '--',
    );
    lastEnergy = energy;
  }
  const active = patterns.filter((token) => token !== '--');
  if (active.length < 24 || new Set(active).size < 2 || lastEnergy < 0) return null;
  // Four-frame ordered shingles preserve changes over time and reduce
  // collisions from unrelated tracks containing the same frequencies.
  const shingles = new Set();
  for (let i = 0; i <= patterns.length - 4; i++) {
    const group = patterns.slice(i, i + 4);
    if (group.includes('--') || new Set(group).size < 2) continue;
    shingles.add(group.join(''));
  }
  if (shingles.size < 8) return null; // Abstain for repetitive/low-information clips.
  return {
    version: 1,
    windowSeconds: HOP_SECONDS,
    shingles: Array.from(shingles).sort().slice(0, 2000),
    frames: patterns.slice(0, 360),
    analyzedSeconds: Math.round(sampleCount / sampleRate),
  };
}

export function compareFingerprints(a, b) {
  if (
    !a ||
    !b ||
    a.version !== 1 ||
    b.version !== 1 ||
    !Array.isArray(a.shingles) ||
    !Array.isArray(b.shingles) ||
    a.shingles.length < 8 ||
    b.shingles.length < 8
  ) {
    return { similarity: 0, candidate: false };
  }
  const first = new Set(a.shingles);
  const second = new Set(b.shingles);
  let common = 0;
  for (const token of first) if (second.has(token)) common++;
  const denominator = first.size + second.size - common;
  const shingleSimilarity = denominator ? common / denominator : 0;
  // Shingles are sensitive to isolated quantization changes after a gain or
  // codec conversion. Compare individual dominant-frequency frames as a
  // complementary screening signal, allowing a short encoder delay.
  let alignedSimilarity = 0;
  let alignedComparisons = 0;
  if (
    Array.isArray(a.frames) &&
    Array.isArray(b.frames) &&
    a.frames.length >= 64 &&
    b.frames.length >= 64
  ) {
    for (let shift = -8; shift <= 8; shift++) {
      let compared = 0;
      let matched = 0;
      for (let i = 0; i < a.frames.length; i++) {
        const x = a.frames[i];
        const y = b.frames[i + shift];
        if (!x || !y || x === '--' || y === '--') continue;
        compared++;
        if (x === y) matched++;
      }
      if (compared >= 60 && matched / compared > alignedSimilarity) {
        alignedSimilarity = matched / compared;
        alignedComparisons = compared;
      }
    }
  }
  const similarity = Math.max(shingleSimilarity, alignedSimilarity);
  return {
    similarity: Math.round(similarity * 1000) / 1000,
    // Screening only. Never a moderation verdict or automatic takedown.
    candidate:
      (common >= 8 && shingleSimilarity >= 0.8) ||
      (alignedComparisons >= 60 && alignedSimilarity >= 0.82),
  };
}
