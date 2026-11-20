import { describe, expect, it } from 'vitest';
import { homePersonalizationKey, parseHomePersonalizationPreference } from './home-personalization';

describe('home recommendation personalization controls', () => {
  it('uses separate keys per signed-in listener', () => {
    expect(homePersonalizationKey('listener-1')).not.toBe(homePersonalizationKey('listener-2'));
  });
  it('defaults to personalized picks and respects opt-out', () => {
    expect(parseHomePersonalizationPreference(null)).toBe(true);
    expect(parseHomePersonalizationPreference('on')).toBe(true);
    expect(parseHomePersonalizationPreference('off')).toBe(false);
  });
});
