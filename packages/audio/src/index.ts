/**
 * Audio quality policy.
 *
 * The platform must never imply that upsampling a low-bitrate source improves
 * fidelity. These pure functions are shared by the upload API, the worker and
 * the tests so that policy cannot drift between layers.
 */

export const LOSSLESS_FORMATS = ['wav', 'flac', 'aiff', 'aif'] as const;
export const ACCEPTED_FORMATS = ['wav', 'flac', 'mp3', 'aiff', 'aif'] as const;

export interface AudioProbe {
  format: string;
  codec: string;
  bitrateKbps: number;
  sampleRate: number;
  channels: number;
  durationSec: number;
  bytes: number;
}

export interface AudioPolicy {
  minBitrateKbps: number;
  maxDurationSeconds: number;
  maxUploadBytes: number;
  targetBitrateKbps: number;
}

export const DEFAULT_AUDIO_POLICY: AudioPolicy = {
  minBitrateKbps: 256,
  maxDurationSeconds: 900,
  maxUploadBytes: 100 * 1024 * 1024,
  targetBitrateKbps: 320,
};

export interface QualityDecision {
  accepted: boolean;
  lossless: boolean;
  /** Serve the original bytes without transcoding. */
  serveOriginal: boolean;
  /** Produce a 320 kbps MP3 rendition. */
  transcodeTarget: number | null;
  /** Human-readable quality label shown in the UI (never inflated). */
  qualityLabel: 'lossless' | 'high' | 'standard' | 'source';
  reasons: string[];
}

export function normalizeFormat(format: string): string {
  const lower = format.trim().toLowerCase().replace(/^\./, '');
  return lower === 'aif' ? 'aiff' : lower;
}

export function isLossless(format: string): boolean {
  return (LOSSLESS_FORMATS as readonly string[]).includes(normalizeFormat(format));
}

export function assessAudioQuality(
  probe: AudioProbe,
  policy: AudioPolicy = DEFAULT_AUDIO_POLICY,
): QualityDecision {
  const reasons: string[] = [];
  const format = normalizeFormat(probe.format);
  const lossless = isLossless(format);

  if (!(ACCEPTED_FORMATS as readonly string[]).includes(format)) {
    reasons.push(`Unsupported format: ${probe.format}`);
  }
  if (probe.bytes > policy.maxUploadBytes) {
    reasons.push(
      `File is ${(probe.bytes / 1024 / 1024).toFixed(1)} MB; limit is ${
        policy.maxUploadBytes / 1024 / 1024
      } MB`,
    );
  }
  if (probe.durationSec > policy.maxDurationSeconds) {
    reasons.push(
      `Duration is ${Math.round(probe.durationSec)}s; limit is ${policy.maxDurationSeconds}s`,
    );
  }
  if (probe.durationSec <= 0) {
    reasons.push('Audio duration could not be detected');
  }

  const effectiveBitrate = lossless
    ? Math.max(probe.bitrateKbps, estimateLosslessBitrate(probe))
    : probe.bitrateKbps;

  if (!lossless && effectiveBitrate < policy.minBitrateKbps) {
    reasons.push(
      `Source bitrate ${Math.round(effectiveBitrate)} kbps is below the ${
        policy.minBitrateKbps
      } kbps minimum. Upload a higher-quality master.`,
    );
  }

  const accepted = reasons.length === 0;
  const alreadyTargetMp3 =
    format === 'mp3' && probe.bitrateKbps >= policy.targetBitrateKbps - 4;

  const serveOriginal = accepted && (lossless || alreadyTargetMp3);
  const transcodeTarget =
    accepted && !lossless && !alreadyTargetMp3 ? policy.targetBitrateKbps : null;

  let qualityLabel: QualityDecision['qualityLabel'] = 'standard';
  if (lossless) qualityLabel = 'lossless';
  else if (probe.bitrateKbps >= 320) qualityLabel = 'high';
  else if (probe.bitrateKbps >= policy.minBitrateKbps) qualityLabel = 'standard';

  return {
    accepted,
    lossless,
    serveOriginal,
    transcodeTarget,
    qualityLabel,
    reasons,
  };
}

export function estimateLosslessBitrate(probe: AudioProbe): number {
  // Uncompressed PCM: sampleRate * channels * 16 bits.
  return (probe.sampleRate * probe.channels * 16) / 1000;
}

export function validateProbe(probe: Partial<AudioProbe>): string[] {
  const errors: string[] = [];
  if (!probe.format) errors.push('Missing audio format');
  if (!probe.codec) errors.push('Missing audio codec');
  if (probe.durationSec === undefined || probe.durationSec <= 0) {
    errors.push('Missing or invalid duration');
  }
  if (probe.bytes === undefined || probe.bytes <= 0)
    errors.push('Missing or invalid size');
  return errors;
}
