import type { MetadataRoute } from 'next';

/** Phase 8 groundwork: installable web identity without caching private audio. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Oddio — AI Music',
    short_name: 'Oddio',
    description: 'Listen to and publish human-reviewed AI music.',
    start_url: '/en',
    scope: '/',
    id: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#100C0D',
    theme_color: '#100C0D',
    icons: [
      {
        src: '/glossy-gradient-play-loop-logo.png',
        type: 'image/png',
        sizes: 'any',
        purpose: 'any',
      },
    ],
  };
}
