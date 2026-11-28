// Run against an Oddio demo server. Uses synthetic audio; never publishes a Story.
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { chromium, devices, webkit } from 'playwright';

const upstream = new URL(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100');
assert.equal(upstream.protocol, 'http:', 'Run against a local Oddio demo server');
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

// WebKit's media process may not honor page-level request interception.
let breakAudio = false;
const fixtureServer = createServer((req, res) => {
  if (req.url.startsWith('/api/story-audio/track/')) {
    if (breakAudio) {
      res.writeHead(503).end();
      return;
    }
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const from = range ? Number(range[1]) : 0;
    const to = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    if (from > to || from >= wav.length) {
      res.writeHead(416, { 'content-range': `bytes */${wav.length}` }).end();
      return;
    }
    const body = wav.subarray(from, to + 1);
    res
      .writeHead(range ? 206 : 200, {
        'content-type': 'audio/wav',
        'content-length': body.length,
        'accept-ranges': 'bytes',
        ...(range && { 'content-range': `bytes ${from}-${to}/${wav.length}` }),
      })
      .end(req.method === 'HEAD' ? undefined : body);
    return;
  }
  const destination = new URL(req.url, upstream);
  if (destination.origin !== upstream.origin) {
    res.writeHead(400).end();
    return;
  }
  const forwarded = request(
    destination,
    { method: req.method, headers: req.headers },
    (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    },
  );
  forwarded.on('error', () => res.writeHead(502).end());
  req.pipe(forwarded);
});
await new Promise((resolve) => fixtureServer.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${fixtureServer.address().port}`;
const previewOnly = process.env.BROWSER_ENGINE === 'webkit';
let browser;
try {
  browser = await (previewOnly ? webkit : chromium).launch({
    ...(process.env.ODDIO_CHROMIUM_EXECUTABLE && {
      executablePath: process.env.ODDIO_CHROMIUM_EXECUTABLE,
    }),
  });
  const page = await browser.newPage({
    ...devices[previewOnly ? 'iPhone 13' : 'Pixel 7'],
  });
  await page.addInitScript((previewOnly) => {
    const result = (window.__story = {});
    const OriginalAudio = window.Audio;
    window.Audio = function (...args) {
      const audio = new OriginalAudio(...args);
      audio.addEventListener('playing', () => {
        if (audio.src.includes('/api/story-audio/'))
          result.previewStart = audio.currentTime;
      });
      return audio;
    };
    window.Audio.prototype = OriginalAudio.prototype;
    if (previewOnly) return;
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
                  if (element.paused) return;
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
      configurable: true,
      value: async ({ files }) => {
        result.handoff = {
          active: navigator.userActivation.isActive,
          size: files[0].size,
        };
      },
    });
  }, previewOnly);
  let releaseLyrics;
  const lyricsGate = new Promise((resolve) => {
    releaseLyrics = resolve;
  });
  await page.route('**/api/tracks/*/synced-lyrics', async (route) => {
    if (!previewOnly) await lyricsGate;
    await route.fulfill({
      json: { data: { srt: '1\n00:00:24,660 --> 00:00:29,000\nالسطر الأول' } },
    });
  });

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
  const slider = dialog.locator('#oddio-clip-start');
  const length = dialog.locator('#oddio-clip-length');
  const preview = dialog.getByRole('button', { name: 'Preview audio' });
  const stopPreview = dialog.getByRole('button', { name: 'Stop', exact: true });
  await slider.fill('24');
  await length.selectOption('10');
  await preview.tap();
  await page.waitForFunction(() => Math.abs(window.__story.previewStart - 24) < 0.3);
  await slider.fill('29');
  await preview.waitFor({ state: 'visible', timeout: 1500 });
  await preview.tap();
  await page.waitForFunction(() => Math.abs(window.__story.previewStart - 29) < 0.3);
  await length.selectOption('15');
  await preview.waitFor({ state: 'visible', timeout: 1500 });
  await slider.fill('39');
  await preview.tap();
  await page.waitForFunction(() => Math.abs(window.__story.previewStart - 39) < 0.3);
  await preview.waitFor({ state: 'visible', timeout: 3500 });
  assert.equal(await dialog.getByRole('alert').count(), 0);
  breakAudio = true;
  await preview.tap();
  assert.equal(
    await dialog.getByRole('alert').innerText(),
    'Could not preview this excerpt.',
  );
  breakAudio = false;
  await slider.fill('33');
  await preview.tap();
  await page.waitForFunction(() => Math.abs(window.__story.previewStart - 33) < 0.3);
  await stopPreview.tap();
  assert.equal(await dialog.getByRole('alert').count(), 0);

  if (previewOnly) {
    const canRecord = await page.evaluate(
      () =>
        typeof MediaRecorder === 'function' &&
        typeof HTMLCanvasElement.prototype.captureStream === 'function',
    );
    if (!canRecord) {
      await dialog.getByRole('button', { name: 'Create Story video' }).tap();
      assert.match(
        await dialog.getByRole('alert').innerText(),
        /cannot record a Story video/,
      );
    }
    console.log(
      'WebKit Story preview: selected seek, edit cancellation and end of media passed',
    );
  } else {
    await slider.fill('24');
    await length.selectOption('10');
    await preview.tap();
    await stopPreview.tap();
    await dialog.getByRole('button', { name: 'Create Story video' }).tap();
    setTimeout(releaseLyrics, 900);
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
    assert.ok(
      result.handoff?.active && result.handoff.size > 1000,
      JSON.stringify(result),
    );
    const link = new URL(
      await dialog.getByRole('textbox', { name: 'Full audio URL' }).inputValue(),
    );
    assert.match(link.pathname, /^\/en\/tracks\//);
    assert.equal(link.searchParams.get('utm_source'), 'instagram');
    console.log(
      'Story clip: timed lyric, complete audio, and direct share passed',
      result,
    );
    await slider.fill('39');
    await dialog.getByRole('button', { name: 'Create Story video' }).tap();
    await dialog
      .getByRole('button', { name: 'Share video' })
      .waitFor({ timeout: 20_000 });
    const nearEnd = await page.evaluate(() => window.__story);
    assert.ok(Math.abs(nearEnd.sourceStart - 39) < 0.15, JSON.stringify(nearEnd));
    assert.ok(Math.abs(nearEnd.sourceEnd - 40) < 0.15, JSON.stringify(nearEnd));
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'share', { value: undefined }),
    );
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Share video' }).tap(),
    ]);
    assert.match(download.suggestedFilename(), /^oddio-story-.*\.(mp4|webm)$/);
    console.log('Story clip: end-of-audio export and download fallback passed');
  }
} finally {
  await browser?.close();
  fixtureServer.close();
}
