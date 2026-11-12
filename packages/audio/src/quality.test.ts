import { describe, expect, it } from 'vitest';
import {
  ACCEPTED_FORMATS,
  DEFAULT_AUDIO_POLICY,
  assessAudioQuality,
  estimateLosslessBitrate,
  isLossless,
  normalizeFormat,
  validateProbe,
  type AudioProbe,
} from './index';

function probe(overrides: Partial<AudioProbe> = {}): AudioProbe {
  return {
    format: 'mp3',
    codec: 'mp3',
    bitrateKbps: 320,
    sampleRate: 44_100,
    channels: 2,
    durationSec: 180,
    bytes: 7_000_000,
    ...overrides,
  };
}

describe('audio quality policy', () => {
  it('accepts a 320 kbps MP3 and serves the original bytes', () => {
    const result = assessAudioQuality(probe(), DEFAULT_AUDIO_POLICY);
    expect(result).toMatchObject({
      accepted: true,
      lossless: false,
      serveOriginal: true,
      transcodeTarget: null,
      qualityLabel: 'high',
    });
  });

  it('transcodes a 256 kbps MP3 to 320 kbps without claiming lossless', () => {
    const result = assessAudioQuality(probe({ bitrateKbps: 256 }), DEFAULT_AUDIO_POLICY);
    expect(result.accepted).toBe(true);
    expect(result.serveOriginal).toBe(false);
    expect(result.transcodeTarget).toBe(320);
    expect(result.qualityLabel).toBe('standard');
  });

  it('rejects sources below the 256 kbps minimum', () => {
    const result = assessAudioQuality(probe({ bitrateKbps: 128 }), DEFAULT_AUDIO_POLICY);
    expect(result.accepted).toBe(false);
    expect(result.reasons.join(' ')).toContain('below the 256 kbps minimum');
  });

  it('serves lossless masters as-is and labels them lossless', () => {
    const result = assessAudioQuality(
      probe({ format: 'wav', codec: 'pcm_s16le', bitrateKbps: 1411 }),
      DEFAULT_AUDIO_POLICY,
    );
    expect(result).toMatchObject({
      accepted: true,
      lossless: true,
      serveOriginal: true,
      transcodeTarget: null,
    });
    expect(result.qualityLabel).toBe('lossless');
  });

  it('rejects oversized files and over-long durations', () => {
    const result = assessAudioQuality(
      probe({ bytes: 101 * 1024 * 1024, durationSec: 901 }),
      DEFAULT_AUDIO_POLICY,
    );
    expect(result.accepted).toBe(false);
    expect(result.reasons).toHaveLength(2);
  });

  it('rejects unsupported containers', () => {
    const result = assessAudioQuality(probe({ format: 'ogg' }), DEFAULT_AUDIO_POLICY);
    expect(result.accepted).toBe(false);
    expect(result.reasons[0]).toContain('Unsupported format');
  });

  it('normalizes formats and identifies lossless containers', () => {
    expect(normalizeFormat('.WAV')).toBe('wav');
    expect(normalizeFormat('aif')).toBe('aiff');
    expect(isLossless('FLAC')).toBe(true);
    expect(ACCEPTED_FORMATS).toContain('mp3');
    expect(
      estimateLosslessBitrate({ sampleRate: 44_100, channels: 2 } as AudioProbe),
    ).toBe(1411.2);
  });

  it('validates incomplete probes', () => {
    expect(validateProbe({})).toHaveLength(4);
    expect(validateProbe(probe())).toHaveLength(0);
  });
});
