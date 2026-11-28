import { describe, expect, it } from 'vitest';
import { describeStoryVideo, selectStoryVideoType } from './story-video-format';

describe('Story export format', () => {
  it('prefers an explicit H.264 and AAC request over a generic MP4 container', () => {
    expect(selectStoryVideoType((type) => type.startsWith('video/mp4'))).toBe(
      'video/mp4;codecs=avc1.42E01F,mp4a.40.2',
    );
    expect(selectStoryVideoType((type) => type === 'video/webm;codecs=vp8,opus')).toBe(
      'video/webm;codecs=vp8,opus',
    );
  });

  it('only marks MP4 compatible when the observed output reports both codecs', () => {
    expect(
      describeStoryVideo(
        'video/mp4',
        'video/mp4; codecs="avc1.640028, mp4a.40.2"',
        'video/mp4',
      ),
    ).toEqual({ extension: 'mp4', type: 'video/mp4', compatible: true });
    expect(
      describeStoryVideo('video/mp4', 'video/mp4', 'video/mp4;codecs=avc1,mp4a.40.2')
        .compatible,
    ).toBe(false);
    expect(
      describeStoryVideo('video/mp4;codecs=avc1,mp4a', '', 'video/mp4').compatible,
    ).toBe(false);
  });

  it('does not treat an MP4 with VP9 or Opus as compatible', () => {
    expect(
      describeStoryVideo(
        'video/mp4;codecs=vp09.00.10.08,opus',
        'video/mp4;codecs=avc1,mp4a',
        'video/mp4',
      ).compatible,
    ).toBe(false);
  });

  it('labels WebM downloads without promising Instagram compatibility', () => {
    expect(describeStoryVideo('', 'video/webm;codecs=vp8,opus', 'video/mp4')).toEqual({
      extension: 'webm',
      type: 'video/webm',
      compatible: false,
    });
  });
});
