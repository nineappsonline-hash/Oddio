import { describe, expect, it } from 'vitest';
import {
  R2_UPLOAD_PART_BYTES,
  multipartPartCount,
  multipartPartLength,
  uploadedMultipartPartsAreValid,
} from './multipart-parts';

describe('Phase 6 Cloudflare R2 multipart', () => {
  const mib = 1024 * 1024;
  it('uses equal 8 MiB chunks except for trailing part', () => {
    expect(R2_UPLOAD_PART_BYTES).toBe(8 * mib);
    expect(multipartPartCount(25 * mib)).toBe(4);
    expect(multipartPartLength(25 * mib, 1)).toBe(8 * mib);
    expect(multipartPartLength(25 * mib, 2)).toBe(8 * mib);
    expect(multipartPartLength(25 * mib, 3)).toBe(8 * mib);
    expect(multipartPartLength(25 * mib, 4)).toBe(1 * mib);
  });
  it('rejects forged missing, duplicate or mismatched parts', () => {
    expect(
      uploadedMultipartPartsAreValid(17 * mib, [
        { partNumber: 1, size: 8 * mib },
        { partNumber: 2, size: 8 * mib },
        { partNumber: 3, size: 1 * mib },
      ]),
    ).toBe(true);
    expect(
      uploadedMultipartPartsAreValid(17 * mib, [
        { partNumber: 1, size: 8 * mib },
        { partNumber: 1, size: 8 * mib },
      ]),
    ).toBe(false);
    expect(
      uploadedMultipartPartsAreValid(17 * mib, [{ partNumber: 4, size: 1 * mib }]),
    ).toBe(false);
    expect(
      uploadedMultipartPartsAreValid(17 * mib, [{ partNumber: 2, size: 7 * mib }]),
    ).toBe(false);
  });
  it('does not accept impossible part numbers or input sizes', () => {
    expect(() => multipartPartLength(17 * mib, 0)).toThrow(RangeError);
    expect(() => multipartPartLength(17 * mib, 4)).toThrow(RangeError);
    expect(() => multipartPartCount(0)).toThrow(RangeError);
    expect(() => multipartPartCount(Number.NaN)).toThrow(RangeError);
  });
});
