import type { ImgHTMLAttributes } from 'react';

/** Preserve the original logo artwork, but fetch a small optimized rendition for tiny UI icons. */
export function OddioPlayIcon({
  size = 24,
  style,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> & {
  size?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/_next/image?url=%2Fglossy-gradient-play-loop-logo.png&w=96&q=75"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        maxWidth: 'none',
        flexShrink: 0,
        ...style,
      }}
      {...props}
    />
  );
}
