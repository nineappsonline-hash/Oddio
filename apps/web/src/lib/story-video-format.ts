const storyVideoTypes = [
  // Level 3.1 supports the 720 × 1280 canvas at 24 fps.
  'video/mp4;codecs=avc1.42E01F,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function selectStoryVideoType(isSupported: (type: string) => boolean) {
  return storyVideoTypes.find(isSupported);
}

function baseType(type: string) {
  return type.split(';', 1)[0]?.trim().toLowerCase();
}

function codecsOf(type: string) {
  const codecs = type.match(/;\s*codecs\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  return (codecs?.[1] ?? codecs?.[2] ?? '')
    .toLowerCase()
    .split(',')
    .map((codec) => codec.trim())
    .filter(Boolean);
}

export function describeStoryVideo(
  blobType: string,
  recorderType: string,
  requestedType: string,
) {
  const observedType = blobType || recorderType;
  const type = baseType(observedType || requestedType);
  if (type !== 'video/mp4' && type !== 'video/webm') {
    throw new Error('Unknown recorded Story video format');
  }
  const blobCodecs = codecsOf(blobType);
  const reportedCodecs =
    blobCodecs.length || baseType(recorderType) !== type
      ? blobCodecs
      : codecsOf(recorderType);
  const compatible =
    type === 'video/mp4' &&
    reportedCodecs.length === 2 &&
    reportedCodecs.some((codec) => /^(avc1|avc3)(\.[\da-f]{6})?$/.test(codec)) &&
    reportedCodecs.includes('mp4a.40.2');
  return { type, extension: type === 'video/mp4' ? 'mp4' : 'webm', compatible };
}
