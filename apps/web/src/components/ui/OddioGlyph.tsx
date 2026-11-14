import type { SVGProps } from 'react';
import { OddioPlayIcon } from '@/components/ui/OddioPlayIcon';

/**
 * Oddio Signal Glyphs — original geometric symbols inspired by
 * modulation, orbiting sound, frequency and layered sonic space.
 * Monochrome, rounded ends, legible at 18–24px, RTL-neutral.
 */
export type OddioGlyphName =
  | 'home'
  | 'discover'
  | 'soundspace'
  | 'charts'
  | 'search'
  | 'library'
  | 'studio'
  | 'admin'
  | 'liked'
  | 'releases'
  | 'notifications'
  | 'settings'
  | 'queue'
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'
  | 'volume'
  | 'account';

export function OddioGlyph({
  name,
  size = 20,
  title,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: OddioGlyphName;
  size?: number;
  title?: string;
}) {
  if (name === 'play') return <OddioPlayIcon size={size} className={props.className} />;
  const shapes: Record<OddioGlyphName, React.ReactNode> = {
    account: (
      <>
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
        <circle cx="12" cy="10" r="2.5" />
        <path d="M7.5 16c1.3-2.6 7.7-2.6 9 0" />
      </>
    ),
    home: (
      <>
        <path d="M3 12 12 4l9 8-9 8-9-8Z" />
        <path d="M8 12h8M12 8v8" />
      </>
    ),
    discover: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m9 15 2-6 6-2-2 6-6 2Z" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    soundspace: (
      <>
        <path d="M3 12c3-9 5 9 9 0s6-9 9 0" />
        <path d="M3 17c4-7 6 7 10 0s5-7 8 0" opacity=".55" />
      </>
    ),
    charts: (
      <>
        <path d="M3 18h18M5 15v-4M9 15V6M13 15v-8M17 15V4M21 15v-6" />
        <circle cx="17" cy="4" r="1.3" fill="currentColor" stroke="none" />
      </>
    ),
    search: (
      <>
        <path d="M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" />
        <path d="m17 17 4 4M7 11c2-3 4 3 7 0" />
      </>
    ),
    library: (
      <>
        <path d="M4 5h16M4 10h16M4 15h16M4 20h10" />
        <path d="m17 17 4 2-4 2v-4Z" fill="currentColor" stroke="none" />
      </>
    ),
    studio: (
      <>
        <path d="M12 3v18M7 6v12M17 7v10M3 10v4M21 10v4" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      </>
    ),
    admin: (
      <>
        <path d="m12 2 9 4v6c0 5-3.5 8-9 10-5.5-2-9-5-9-10V6l9-4Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    liked: (
      <>
        <path d="M12 21s-9-5.5-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.5-9 12-9 12Z" />
        <path d="M7 12h3l2-3 2 6 2-3h2" />
      </>
    ),
    releases: (
      <>
        <path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" />
        <circle cx="12" cy="12" r="3.5" fill="#101010" />
      </>
    ),
    notifications: (
      <>
        <path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 20h4" />
        <path d="M12 5V2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" />
      </>
    ),
    queue: (
      <>
        <path d="M3 6h18M3 11h14M3 16h9" />
        <path d="m16 14 5 3-5 3v-6Z" fill="currentColor" stroke="none" />
      </>
    ),
    play: (
      <>
        <path d="m8 4 12 8-12 8V4Z" fill="currentColor" stroke="none" />
        <path d="M4 7v10" />
      </>
    ),
    pause: (
      <>
        <path d="M7 5v14M17 5v14" strokeWidth="4" />
      </>
    ),
    next: (
      <>
        <path d="m5 5 11 7-11 7V5Z" />
        <path d="M19 5v14" />
      </>
    ),
    previous: (
      <>
        <path d="m19 5-11 7 11 7V5Z" />
        <path d="M5 5v14" />
      </>
    ),
    volume: (
      <>
        <path d="M4 9h4l5-4v14l-5-4H4V9ZM17 9c2 2 2 4 0 6M20 6c4 4 4 8 0 12" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {shapes[name]}
    </svg>
  );
}
