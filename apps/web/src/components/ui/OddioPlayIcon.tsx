import type { ImgHTMLAttributes } from 'react';

/** Render the original Glossy Gradient Play Loop Logo PNG directly, without SVG raster resampling. */
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
      src="/glossy-gradient-play-loop-logo.png"
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
