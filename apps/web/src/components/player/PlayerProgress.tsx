'use client';

import { memo } from 'react';
import { usePlayer } from '@/lib/player-store';
import { formatDuration } from '@/lib/utils';

/** Subscribe only the progress indicator to playback ticks, keeping the
 * rest of the player bar (menus, artwork, queue, reactions) out of the
 * 500ms React update loop. */
export const PlayerSeekProgress = memo(function PlayerSeekProgress({
  rtl,
  label,
}: {
  rtl: boolean;
  label: string;
}) {
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const seek = usePlayer((state) => state.seek);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  return (
    <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
      <span className="shrink-0 text-xs tabular-nums text-white/75">
        {formatDuration(currentTime * 1000)} / {formatDuration(duration * 1000)}
      </span>
      <input
        type="range"
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label={label}
        className="h-1 w-full min-w-0 cursor-pointer accent-[#b048eb]"
        style={{
          background: `linear-gradient(to ${rtl ? 'left' : 'right'}, #b048eb ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
        }}
      />
    </div>
  );
});

export const PlayerMiniProgress = memo(function PlayerMiniProgress() {
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-0 h-[2px] overflow-hidden rounded-full bg-white/10 lg:hidden">
      <div className="h-full bg-[#b048eb]" style={{ width: `${progress}%` }} />
    </div>
  );
});
