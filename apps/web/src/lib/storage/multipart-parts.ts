/** R2 multipart uses equal 8 MiB parts except for the trailing part. */
export const R2_UPLOAD_PART_BYTES = 8 * 1024 * 1024;
export const R2_MULTIPART_MIN_BYTES = 5 * 1024 * 1024;
export const R2_MULTIPART_THRESHOLD = R2_UPLOAD_PART_BYTES;

export function multipartPartCount(totalBytes: number, partBytes = R2_UPLOAD_PART_BYTES) {
  if (
    !Number.isSafeInteger(totalBytes) ||
    totalBytes <= 0 ||
    !Number.isSafeInteger(partBytes) ||
    partBytes < R2_MULTIPART_MIN_BYTES
  ) {
    throw new RangeError('Invalid multipart size');
  }
  return Math.ceil(totalBytes / partBytes);
}

export function multipartPartLength(
  totalBytes: number,
  partNumber: number,
  partBytes = R2_UPLOAD_PART_BYTES,
) {
  const count = multipartPartCount(totalBytes, partBytes);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > count) {
    throw new RangeError('Multipart part number is out of range');
  }
  return Math.min(partBytes, totalBytes - (partNumber - 1) * partBytes);
}

export function uploadedMultipartPartsAreValid(
  bytes: number,
  parts: ReadonlyArray<{ partNumber: number; size: number }>,
): boolean {
  try {
    const count = multipartPartCount(bytes);
    const seen = new Set<number>();
    return (
      parts.length <= count &&
      parts.every(({ partNumber, size }) => {
        if (seen.has(partNumber) || size !== multipartPartLength(bytes, partNumber)) {
          return false;
        }
        seen.add(partNumber);
        return true;
      })
    );
  } catch {
    return false;
  }
}
