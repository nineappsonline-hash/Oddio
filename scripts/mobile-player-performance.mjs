import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const base = new URL(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100');
const path = process.env.ODDIO_MOBILE_PLAYER_PATH || '/en';
const url = new URL(path, base);
assert.equal(url.origin, base.origin, 'Use a player path on the target origin');

const configuredBrowser = process.env.ODDIO_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({
  headless: true,
  ...(configuredBrowser && { executablePath: configuredBrowser }),
  ...(process.env.ODDIO_CHROMIUM_PROXY && {
    proxy: { server: process.env.ODDIO_CHROMIUM_PROXY },
  }),
});

const fullPlayer = '.oddio-full-player';
const panel = '#oddio-mobile-lyrics';
const timedView = `${panel} [aria-live="off"]`;
const timedLine = `${timedView} p:not(:empty)`;
const plainView = `${panel} [data-plain-lyrics]`;
const hasLiveApi = process.env.ODDIO_LYRICS_FIXTURE === 'live';
const seekSeconds = Number(process.env.ODDIO_PLAYER_SEEK_SECONDS || 0);
assert.ok(Number.isFinite(seekSeconds) && seekSeconds >= 0, 'Invalid seek timestamp');
const fixtureLine = 'Oddio test lyrics';
const fixtures = {
  timed: {
    srt: `1\n00:00:00,000 --> 00:05:00,000\n${fixtureLine}`,
    text: 'Fallback lyric should not replace synced lyrics',
  },
  plain: { srt: null, text: `${fixtureLine}\nSecond line` },
  empty: { srt: null, text: null },
};

async function armTap(button, marks) {
  await button.evaluate((element, marks) => {
    window.__oddioPlayerMarks = {};
    element.addEventListener(
      'click',
      () => {
        const started = performance.now();
        const pending = new Map(Object.entries(marks));
        const sample = () => {
          const elapsed = performance.now() - started;
          for (const [name, { selector, exclude }] of pending) {
            const target = document.querySelector(selector);
            if (
              target?.getClientRects().length &&
              getComputedStyle(target).visibility === 'visible' &&
              (!exclude || target.textContent.trim() !== exclude)
            ) {
              window.__oddioPlayerMarks[name] = Math.round(elapsed);
              pending.delete(name);
            }
          }
          if (pending.size && elapsed < 15_000) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      },
      { capture: true, once: true },
    );
  }, marks);
}

async function measure(mode) {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    reducedMotion: 'reduce',
    ignoreHTTPSErrors: Boolean(process.env.ODDIO_CHROMIUM_PROXY),
  });
  try {
    const page = await context.newPage();
    const pageErrors = [];
    const lyricsRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.endsWith('/synced-lyrics'))
        lyricsRequests.push(request);
    });
    if (mode !== 'live') {
      await page.route('**/api/tracks/*/synced-lyrics', (route) =>
        route.fulfill({ json: { data: fixtures[mode] } }),
      );
    }

    const response = await page.goto(url.toString(), {
      waitUntil: 'load',
      timeout: 45_000,
    });
    assert.ok(response?.ok(), `Player starting page returned HTTP ${response?.status()}`);
    const idle = page.locator('.oddio-idle-player, .mp2-player');
    await idle.waitFor({ state: 'visible' });
    const trigger =
      url.pathname === '/en'
        ? page.locator('.oddio-stage-play')
        : page
            .getByRole('main')
            .getByRole('button', { name: 'Play', exact: true })
            .first();
    await trigger.tap();
    const mini = page.getByRole('region', { name: /oddio music player|mini player/i });
    const expand = mini.getByRole('button', { name: /expand/i }).last();
    await expand.waitFor({ state: 'visible' });
    if (process.env.ODDIO_PLAYER_DWELL_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, Number(process.env.ODDIO_PLAYER_DWELL_MS)),
      );
    }
    await armTap(expand, { fullPlayerVisibleMs: { selector: fullPlayer } });
    await expand.tap();
    await page.locator(fullPlayer).waitFor({ state: 'visible' });
    assert.equal(lyricsRequests.length, 0, 'Opening the player must not fetch lyrics');
    await page.waitForFunction(
      () => window.__oddioPlayerMarks?.fullPlayerVisibleMs != null,
    );
    const fullPlayerVisibleMs = await page.evaluate(
      () => window.__oddioPlayerMarks.fullPlayerVisibleMs,
    );

    // A real track may have a long instrumental intro. Park on a known
    // lyric cue without including the deliberate seek in the measured time.
    if (mode === 'live' && seekSeconds) {
      const dialog = page.locator(fullPlayer);
      const pause = dialog.getByRole('button', { name: 'Pause', exact: true }).first();
      if (await pause.isVisible()) await pause.tap();
      const seek = dialog.getByRole('slider', { name: 'Seek' });
      await page.waitForFunction(
        ({ fullPlayer, seekSeconds }) => {
          const range = document.querySelector(`${fullPlayer} input[aria-label="Seek"]`);
          return range && Number(range.max) > seekSeconds;
        },
        { fullPlayer, seekSeconds },
      );
      await seek.fill(String(seekSeconds));
      await page.waitForFunction(
        ({ fullPlayer, seekSeconds }) => {
          const range = document.querySelector(`${fullPlayer} input[aria-label="Seek"]`);
          return range && Math.abs(Number(range.value) - seekSeconds) < 0.25;
        },
        { fullPlayer, seekSeconds },
      );
    }
    const showLyrics = page.locator(
      `${fullPlayer} button[aria-controls="oddio-mobile-lyrics"]`,
    );
    await showLyrics.waitFor({ state: 'visible' });
    await armTap(showLyrics, {
      lyricsPanelVisibleMs: { selector: panel },
      syncedLyricsReadyMs: { selector: timedView },
      firstTimedLineMs: { selector: timedLine, exclude: '♪' },
      plainLyricsReadyMs: { selector: plainView },
    });
    const [lyricsResponse] = await Promise.all([
      page.waitForResponse(
        (response) => new URL(response.url()).pathname.endsWith('/synced-lyrics'),
        { timeout: 20_000 },
      ),
      showLyrics.tap(),
    ]);
    assert.ok(lyricsResponse.ok(), `Lyrics returned HTTP ${lyricsResponse.status()}`);
    const { data } = await lyricsResponse.json();
    const availability = data?.srt ? 'timed' : data?.text?.trim() ? 'plain' : 'empty';
    if (availability === 'timed') {
      await page.locator(timedView).waitFor({ state: 'visible' });
      if (mode !== 'live') {
        await page.locator(timedLine).filter({ hasText: fixtureLine }).waitFor({
          state: 'visible',
        });
      }
    } else if (availability === 'plain') {
      if (mode !== 'live') {
        await page.locator(plainView).filter({ hasText: fixtureLine }).waitFor({
          state: 'visible',
        });
      }
    } else {
      await page
        .getByText('No saved lyrics yet', { exact: true })
        .waitFor({ state: 'visible' });
    }

    await page.waitForFunction(
      () => window.__oddioPlayerMarks?.lyricsPanelVisibleMs != null,
    );
    if (
      mode === 'timed' ||
      (mode === 'live' && seekSeconds && availability === 'timed')
    ) {
      await page.waitForFunction(
        () => window.__oddioPlayerMarks?.firstTimedLineMs != null,
      );
    } else if (mode === 'plain') {
      await page.waitForFunction(
        () => window.__oddioPlayerMarks?.plainLyricsReadyMs != null,
      );
    }
    const marks = await page.evaluate(() => window.__oddioPlayerMarks);
    const report = {
      mode,
      availability,
      fullPlayerVisibleMs,
      ...marks,
      lyricsVisible:
        availability === 'timed'
          ? marks.firstTimedLineMs != null
          : availability === 'plain'
            ? await page.locator(plainView).isVisible()
            : false,
      lyricsHttpStatus: lyricsResponse.status(),
      lyricsEndpointMs: Math.round(
        lyricsRequests[0].timing().responseEnd - lyricsRequests[0].timing().requestStart,
      ),
      pageErrors,
    };
    console.log(JSON.stringify(report));
    assert.equal(pageErrors.length, 0, pageErrors.join('; '));
    assert.equal(lyricsRequests.length, 1);
    return report;
  } finally {
    await context.close();
  }
}

try {
  if (hasLiveApi) {
    const count = Number(process.env.ODDIO_MOBILE_PLAYER_SAMPLES || 3);
    assert.ok(Number.isInteger(count) && count >= 1 && count <= 10);
    const samples = [];
    for (let i = 0; i < count; i++) samples.push(await measure('live'));
    const median = (key) => {
      const numbers = samples
        .map((sample) => sample[key])
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      if (!numbers.length) return null;
      const middle = Math.floor(numbers.length / 2);
      return numbers.length % 2
        ? numbers[middle]
        : (numbers[middle - 1] + numbers[middle]) / 2;
    };
    console.log(
      JSON.stringify(
        Object.fromEntries(
          [
            'fullPlayerVisibleMs',
            'lyricsPanelVisibleMs',
            'syncedLyricsReadyMs',
            'firstTimedLineMs',
            'plainLyricsReadyMs',
            'lyricsEndpointMs',
          ].map((key) => [key, median(key)]),
        ),
      ),
    );
  } else {
    for (const mode of Object.keys(fixtures)) await measure(mode);
  }
} finally {
  await browser.close();
}
