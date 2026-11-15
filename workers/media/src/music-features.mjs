/**
 * Dependency-free audio feature extraction for mono PCM16LE decoded by FFmpeg.
 * An intentionally conservative baseline: BPM is an estimate, and no genre or
 * mood is claimed without a separately evaluated classifier/artist approval.
 */
export function analyzePcm16(buffer, sampleRate = 11025) {
  if (!Buffer.isBuffer(buffer) || sampleRate < 1000 || sampleRate > 96000) {
    throw new Error('Expected mono PCM16LE and a valid sample rate');
  }
  if (buffer.length % 2 !== 0) throw new Error('Invalid PCM frame alignment');
  const hop = Math.max(1, Math.round(sampleRate * 0.01));
  const frameCount = Math.floor(buffer.length / 2);
  if (frameCount === 0) return {
    durationSeconds: 0, rmsDbfs: null, peakDbfs: null, tempoBpm: null,
    tempoConfidence: 0, onsetStrength: 0,
  };
  let peak = 0;
  let energy = 0;
  const envelopes = [];
  for (let start = 0; start < frameCount; start += hop) {
    const end = Math.min(frameCount, start + hop);
    let sum = 0;
    for (let i = start; i < end; i++) {
      const s = buffer.readInt16LE(i * 2) / 32768;
      const sq = s * s;
      energy += sq;
      sum += sq;
      peak = Math.max(peak, Math.abs(s));
    }
    envelopes.push(Math.sqrt(sum / (end - start)));
  }
  const rms = Math.sqrt(energy / frameCount);
  const rmsDbfs = rms ? Math.round(20 * Math.log10(rms) * 10) / 10 : -120;
  const peakDbfs = peak ? Math.round(20 * Math.log10(peak) * 10) / 10 : -120;

  // Half-wave rectify positive energy changes, with adaptive local baseline.
  // Onsets measure pulses, not musical note identity or genre.
  const onset = envelopes.map((v, i) => {
    const previous = i ? envelopes[i - 1] : v;
    return Math.max(0, v - previous);
  });
  const mean = onset.reduce((a, b) => a + b, 0) / onset.length;
  const variance = onset.reduce((a, b) => a + (b - mean) ** 2, 0) / onset.length;
  const std = Math.sqrt(variance);
  const threshold = mean + std * 0.65;
  const cleaned = onset.map((value) => Math.max(0, value - threshold));
  const strength = cleaned.reduce((a, b) => a + b, 0);
  const durationSeconds = frameCount / sampleRate;
  if (durationSeconds < 8 || strength < 0.015) {
    return { durationSeconds, rmsDbfs, peakDbfs, tempoBpm: null, tempoConfidence: 0,
      onsetStrength: Math.round(strength * 1000) / 1000 };
  }
  const frameRate = sampleRate / hop;
  const minLag = Math.ceil((60 * frameRate) / 180);
  const maxLag = Math.min(cleaned.length - 1, Math.floor((60 * frameRate) / 65));
  let best = { score: 0, lag: 0 };
  let sumScores = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let cross = 0;
    let powerA = 0;
    let powerB = 0;
    for (let i = lag; i < cleaned.length; i++) {
      cross += cleaned[i] * cleaned[i - lag];
      powerA += cleaned[i] ** 2;
      powerB += cleaned[i - lag] ** 2;
    }
    const score = cross / (Math.sqrt(powerA * powerB) || 1);
    sumScores += score;
    if (score > best.score) best = { score, lag };
  }
  const meanScore = sumScores / Math.max(1, maxLag - minLag + 1);
  const contrast = best.score / Math.max(0.001, meanScore);
  const confidence = Math.min(1, best.score * Math.min(1, contrast / 2));
  return {
    durationSeconds: Math.round(durationSeconds * 100) / 100,
    rmsDbfs,
    peakDbfs,
    tempoBpm: best.lag && confidence >= 0.24
      ? Math.round((60 * frameRate) / best.lag) : null,
    tempoConfidence: Math.round(confidence * 100) / 100,
    onsetStrength: Math.round(strength * 1000) / 1000,
  };
}
