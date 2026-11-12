import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AudioProbe } from '@ai-music/audio';

const execFileAsync = promisify(execFile);

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  bit_rate?: string;
  sample_rate?: string;
  channels?: number;
}

interface FfprobeOutput {
  format?: {
    format_name?: string;
    duration?: string;
    bit_rate?: string;
    size?: string;
  };
  streams?: FfprobeStream[];
}

export async function probeAudio(filePath: string): Promise<AudioProbe> {
  const { stdout } = await execFileAsync(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath],
    { timeout: 20_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const parsed = JSON.parse(stdout) as FfprobeOutput;
  const stream = parsed.streams?.find((item) => item.codec_type === 'audio');
  if (!stream) throw new Error('No audio stream found in file');
  const durationSec = Number(parsed.format?.duration ?? 0);
  const formatName = parsed.format?.format_name ?? '';
  const format = formatName.split(',')[0] ?? formatName;
  const bitrate = Number(parsed.format?.bit_rate ?? stream.bit_rate ?? 0);
  return {
    format,
    codec: stream.codec_name ?? 'unknown',
    bitrateKbps: bitrate > 0 ? Math.round(bitrate / 1000) : 0,
    sampleRate: Number(stream.sample_rate ?? 0),
    channels: Number(stream.channels ?? 2),
    durationSec,
    bytes: Number(parsed.format?.size ?? 0),
  };
}

export async function transcodeToMp3(
  inputPath: string,
  outputPath: string,
  bitrateKbps: number,
  maxDurationSeconds: number,
): Promise<void> {
  await execFileAsync(
    'ffmpeg',
    [
      '-y',
      '-i',
      inputPath,
      '-t',
      String(maxDurationSeconds),
      '-vn',
      '-codec:a',
      'libmp3lame',
      '-b:a',
      `${bitrateKbps}k`,
      '-ar',
      '44100',
      '-ac',
      '2',
      outputPath,
    ],
    { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 },
  );
}
