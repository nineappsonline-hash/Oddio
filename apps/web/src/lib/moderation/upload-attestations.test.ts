import { describe, expect, it } from 'vitest';
import { assertUploadAttestations } from './upload-attestations';

describe('creator upload attestations', () => {
  it('refuses submissions without explicit rights confirmation', () => {
    expect(() => assertUploadAttestations({ rightsConfirmed: '', voiceConfirmed: 'yes' }))
      .toThrow(/permission to distribute/);
  });

  it('refuses submissions without voice and likeness consent declaration', () => {
    expect(() => assertUploadAttestations({ rightsConfirmed: 'yes', voiceConfirmed: '' }))
      .toThrow(/imitated a real person/);
  });

  it('accepts both positive declarations without claiming to verify licenses', () => {
    expect(() => assertUploadAttestations({ rightsConfirmed: 'yes', voiceConfirmed: 'yes' }))
      .not.toThrow();
  });
});
