// Run against an Oddio demo server. Uses synthetic audio; never publishes a Story.
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100';
const sampleRate = 16000;
const samples = 40 * sampleRate;
const wav = Buffer.alloc(44 + 2 * samples);
wav.write('RIFF');
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(2 * sampleRate, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(2 * samples, 40);
for (let i = 0; i < samples; i++)
  wav.writeInt16LE(
    Math.round(4200 * Math.sin((2 * Math.PI * 440 * i) / sampleRate)),
    44 + 2 * i,
  );

const browser = await chromium.launch({
  ...(process.env.ODDIO_CHROMIUM_EXECUTABLE && {
    executablePath: process.env.ODDIO_CHROMIUM_EXECUTABLE,
  }),
});
try {
  const page = await browser.newPage({ ...devices['Pixel 7'] });
  await page.addInitScript(() => {
    const result = (window.__story = {});
    const create = document.createElement.bind(document);
    const play = HTMLMediaElement.prototype.play;
    let recordingAudio;
    document.createElement = function (tag, ...args) {
      const element = create(tag, ...args);
      if (tag === 'audio') {
        element.play = async function () {
          if (element.src.includes('/api/story-audio/')) {
            recordingAudio = element;
            await new Promise((resolve) => setTimeout(resolve, 1800));
            element.addEventListener(
              'playing',
              () => {
                result.audioStart = performance.now();
                result.sourceStart = element.currentTime;
                setTimeout(() => {
                  element.pause();
                  element.dispatchEvent(new Event('waiting'));
                  setTimeout(() => void play.call(element), 750);
                }, 1100);
              },
              { once: true },
            );
          }
          return play.call(element);
        };
      }
      return element;
    };
    const start = MediaRecorder.prototype.start;
    MediaRecorder.prototype.start = function (...args) {
      result.recorderStart = performance.now();
      return start.apply(this, args);
    };
    const pause = MediaRecorder.prototype.pause;
    MediaRecorder.prototype.pause = function (...args) {
      result.waiting = performance.now();
      return pause.apply(this, args);
    };
    const resume = MediaRecorder.prototype.resume;
    MediaRecorder.prototype.resume = function (...args) {
      result.resumed = performance.now();
      return resume.apply(this, args);
    };
    const stop = MediaRecorder.prototype.stop;
    MediaRecorder.prototype.stop = function (...args) {
      result.sourceEnd = recordingAudio?.currentTime;
      return stop.apply(this, args);
    };
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (text === 'السطر الأول' && this.canvas.width === 720)
        result.firstLyric ??= performance.now();
      return fillText.call(this, text, ...args);
    };
    // A pending clipboard operation must never prevent opening native share.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => new Promise(() => {}) },
    });
    Object.defineProperty(navigator, 'canShare', {
      value: ({ files }) => files.length > 0,
    });
    Object.defineProperty(navigator, 'share', {
      value: async ({ files }) => {
        result.handoff = {
          active: navigator.userActivation.isActive,
          size: files[0].size,
        };
      },
    });
  });
  await page.route('**/api/story-audio/track/*', async (route) => {
    const range = route
      .request()
      .headers()
      .range?.match(/^bytes=(\d+)-(\d*)$/);
    const from = range ? Number(range[1]) : 0;
    const to = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    await route.fulfill({
      status: 206,
      headers: {
        'content-type': 'audio/wav',
        'accept-ranges': 'bytes',
        'content-range': `bytes ${from}-${to}/${wav.length}`,
      },
      body: wav.subarray(from, to + 1),
    });
  });
  await page.route('**/api/tracks/*/synced-lyrics', (route) =>
    route.fulfill({
      json: { data: { srt: '1\n00:00:24,660 --> 00:00:29,000\nالسطر الأول' } },
    }),
  );

  await page.goto(new URL('/en', base).toString());
  await page.locator('.oddio-stage-play').tap();
  await page
    .getByRole('region', { name: /mini player/i })
    .getByRole('button', { name: /expand/i })
    .last()
    .tap();
  const player = page.locator('.oddio-full-player');
  await player.getByRole('button', { name: /share/i }).first().tap();
  await page.getByRole('menuitem', { name: /Instagram Story/ }).tap();
  const dialog = page.getByRole('dialog', { name: /Instagram Story/i });
  await page.waitForFunction(
    () => Number(document.querySelector('#oddio-clip-start')?.max) === 39,
  );
  await dialog.locator('#oddio-clip-start').fill('24');
  await dialog.locator('#oddio-clip-length').selectOption('10');
  await dialog.getByRole('button', { name: 'Preview audio' }).tap();
  await dialog.getByRole('button', { name: 'Stop', exact: true }).tap();
  await dialog.getByRole('button', { name: 'Create Story video' }).tap();
  await dialog.getByRole('button', { name: 'Share video' }).tap({ timeout: 40_000 });

  const result = await page.evaluate(() => window.__story);
  assert.ok(
    Math.abs(result.audioStart - result.recorderStart) < 100,
    JSON.stringify(result),
  );
  assert.ok(Math.abs(result.sourceStart - 24) < 0.15, JSON.stringify(result));
  assert.ok(Math.abs(result.sourceEnd - 34) < 0.25, JSON.stringify(result));
  assert.ok(
    Math.abs(result.firstLyric - result.audioStart - 660) < 160,
    JSON.stringify(result),
  );
  assert.ok(result.resumed - result.waiting >= 700, JSON.stringify(result));
  assert.ok(result.handoff?.active && result.handoff.size > 1000, JSON.stringify(result));
  const link = new URL(
    await dialog.getByRole('textbox', { name: 'Full audio URL' }).inputValue(),
  );
  assert.match(link.pathname, /^\/en\/tracks\//);
  assert.equal(link.searchParams.get('utm_source'), 'instagram');
  console.log('Story clip: timed lyric, complete audio, and direct share passed', result);
} finally {
  await browser.close();
}
