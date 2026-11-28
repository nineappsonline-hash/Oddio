import { describe, expect, it } from 'vitest';
import {
  describePodcastEpisode,
  describePodcastShow,
  describeTrack,
  searchDescription,
} from './catalog-descriptions';

const track = {
  title: 'After Hours',
  artist: { name: 'Jimmy' },
  genre: { labelAr: 'روك', labelEn: 'Rock' },
  moods: [{ labelAr: 'هادي', labelEn: 'Calm' }],
  durationMs: 202_000,
  description: ' \n ',
};
const show = { title: 'رحلة', author: 'علي', description: '' };
const episode = {
  title: 'البداية',
  durationSeconds: 675,
  seasonNumber: 2,
  episodeNumber: 3,
};

describe('catalog descriptions', () => {
  it('uses the display language and only available track facts', () => {
    expect(describeTrack(track, 'en')).toBe(
      'Listen to “After Hours” by Jimmy on Oddio. Genre: Rock. Mood: Calm. Duration: 3:22.',
    );
    expect(describeTrack(track, 'ar')).toContain('النوع: روك. المزاج: هادي.');
    expect(describeTrack({ title: 'Solo', durationMs: Number.NaN }, 'en')).toBe(
      'Listen to “Solo” on Oddio.',
    );
  });

  it('keeps nonblank descriptions exactly, and preserves editorial fallbacks', () => {
    const own = 'Written  by creator\nSecond line';
    expect(describeTrack({ ...track, description: own }, 'ar')).toBe(own);
    expect(
      describePodcastShow({ ...show, description: own }, 'en', {
        hasEpisodes: true,
        editorial: 'Editorial',
      }),
    ).toBe(own);
    expect(
      describePodcastShow(show, 'en', { hasEpisodes: true, editorial: 'Editorial' }),
    ).toBe('Editorial');
    expect(
      describePodcastEpisode({ ...episode, description: own }, show, 'en', 'Editorial'),
    ).toBe(own);
    expect(describePodcastEpisode(episode, show, 'en', 'Editorial')).toBe('Editorial');
  });

  it('uses actual show details and never promises episodes for empty series', () => {
    expect(
      describePodcastShow(show, 'ar', { category: 'ثقافة', hasEpisodes: true }),
    ).toContain('التصنيف: ثقافة. تصفّح الحلقات المنشورة');
    expect(describePodcastShow(show, 'en', { hasEpisodes: false })).not.toContain(
      'published episodes',
    );
  });

  it('includes only supplied episode numbering and playable duration', () => {
    expect(describePodcastEpisode(episode, show, 'en')).toContain(
      'Season 2, Episode 3. Duration: 11:15.',
    );
    expect(
      describePodcastEpisode(
        { title: 'Test', durationSeconds: 0, episodeNumber: 1 },
        show,
        'ar',
      ),
    ).toMatch(/الحلقة 1\.$/);
    expect(describePodcastEpisode({ title: 'Test' }, show, 'en')).not.toMatch(
      /Season|Episode|Duration/,
    );
  });

  it('normalizes metadata and avoids cutting normal words or surrogate pairs', () => {
    expect(searchDescription(' test\n copy  ')).toBe('test copy');
    expect(searchDescription('Episode summary '.repeat(15))).toMatch(
      /(?:Episode|summary)…$/,
    );
    expect(Array.from(searchDescription('🎧'.repeat(180))).length).toBeLessThanOrEqual(
      160,
    );
  });
});
