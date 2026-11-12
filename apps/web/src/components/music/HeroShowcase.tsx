import { Sparkles } from 'lucide-react';
import type { Locale } from '@ai-music/contracts';
import type { CatalogTrack } from '@/lib/data/queries';
import { Artwork } from '@/components/ui/Artwork';
import { PlayButton } from '@/components/player/PlayButton';
import { Equalizer } from '@/components/visuals/Equalizer';
import { formatNumber } from '@/lib/utils';

export function HeroShowcase({
  track,
  queue,
  locale,
  nowPlayingLabel,
  playsLabel,
  productionLabel,
}: {
  track: CatalogTrack;
  queue: CatalogTrack[];
  locale: Locale;
  nowPlayingLabel: string;
  playsLabel: string;
  productionLabel: string;
}) {
  const accent = track.artwork.accent;

  return (
    <div className="hero-stage mx-auto w-full max-w-[25rem] px-6 py-8 sm:px-8">
      <div className="relative aspect-square">
        <div
          className="hero-halo"
          style={{
            background: `radial-gradient(circle, ${accent}aa 0%, transparent 68%)`,
          }}
        />
        <div className="hero-ring hero-ring-dashed-reverse" />
        <div className="hero-ring hero-ring-dashed" />
        <div className="hero-ring hero-ring-conic" />

        <div className="absolute inset-[10%] overflow-hidden rounded-full border border-white/15 bg-black/50 p-1.5 shadow-glow-lg backdrop-blur">
          <Artwork
            title={track.title}
            url={track.artwork.url}
            accent={accent}
            className="h-full w-full"
            rounded="rounded-full"
          />
          <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute -inset-4 animate-pulse-ring rounded-full border border-white/25" />
          <PlayButton
            track={track}
            queue={queue}
            size="lg"
            className="h-16 w-16 shadow-glow-lg ring-4 ring-white/10"
          />
        </div>

        <div className="absolute -start-2 top-5 sm:-start-6">
          <span className="glass-pill inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
            <Sparkles className="h-3 w-3 text-cyan" />
            {productionLabel}
          </span>
        </div>

        <div className="absolute -end-1 top-[38%] sm:-end-5">
          <span className="glass-pill inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_rgba(65,217,255,0.9)]" />
            {track.qualityLabel}
          </span>
        </div>

        <div className="absolute -bottom-1 start-2 sm:start-0">
          <span className="glass-pill inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-[10px] font-semibold text-muted">
            {formatNumber(track.qualifiedPlays, locale)} {playsLabel}
          </span>
        </div>

        <div className="absolute -bottom-5 end-0 sm:-end-2">
          <span className="glass-pill inline-flex items-center gap-2.5 rounded-pill px-3.5 py-2 text-[11px] font-semibold text-ink">
            <Equalizer bars={4} className="h-3.5 text-primary" />
            {nowPlayingLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
