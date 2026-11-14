import type { SVGProps } from 'react';

/** Displays the exact user-uploaded Glossy Gradient Play Loop Logo artwork. */
export function OddioPlayIcon({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true" {...props}>
      <image href="/glossy-gradient-play-loop-logo.png" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}
