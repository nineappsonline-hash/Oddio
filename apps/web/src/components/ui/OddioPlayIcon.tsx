import type { SVGProps } from 'react';

/** Compact play mark inspired by the gradient orbit and triangle in the Oddio logo. */
export function OddioPlayIcon({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="oddio-play-orbit" x1="5" y1="42" x2="42" y2="5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8A35FF" /><stop offset=".45" stopColor="#D84DFF" /><stop offset=".78" stopColor="#16D8F5" /><stop offset="1" stopColor="#6C4AFF" />
        </linearGradient>
      </defs>
      <path d="M42 15C37 6 20 5 10 14 1 22 3 36 14 40c11 5 28-3 30-16" stroke="url(#oddio-play-orbit)" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M8 33C17 40 34 34 41 24" stroke="url(#oddio-play-orbit)" strokeWidth="3" strokeLinecap="round" opacity=".9" />
      <path d="m20 16 15 9-15 9V16Z" fill="white" stroke="#20112D" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
