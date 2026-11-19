'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { usePlayer } from '@/lib/player-store';

/**
 * Lightweight native slider: its thumb and fill move immediately under the
 * finger, independently from React rendering and store persistence.
 * iOS Safari does not support programmatically adjusting media volume, so
 * display an accurate hardware-volume hint instead of a nonfunctional range.
 */
export function PlayerVolumeControl({ rtl, mobile = false, label }: {
  rtl: boolean;
  mobile?: boolean;
  label: string;
}) {
  const volume = usePlayer((state) => state.volume);
  const muted = usePlayer((state) => state.muted);
  const toggleMute = usePlayer((state) => state.toggleMute);
  const setVolume = usePlayer((state) => state.setVolume);
  const [ios, setIos] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLOutputElement>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<number>(volume);

  useEffect(() => {
    // Every browser on iOS uses WebKit, including Chrome on iPhone.
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const pct = Math.round((muted ? 0 : volume) * 100);
  useEffect(() => {
    const slider = sliderRef.current;
    if (slider && document.activeElement !== slider) {
      slider.value = String(pct);
      slider.style.setProperty('--oddio-volume-progress', `${pct}%`);
    }
    if (outputRef.current) outputRef.current.textContent = String(pct);
  }, [pct]);

  const updateFromInput = (element: HTMLInputElement) => {
    const value = Math.max(0, Math.min(100, Number(element.value)));
    pendingRef.current = value / 100;
    element.style.setProperty('--oddio-volume-progress', `${value}%`);
    if (outputRef.current) outputRef.current.textContent = String(value);
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setVolume(pendingRef.current);
    });
  };

  const finishDrag = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setVolume(pendingRef.current);
  };

  if (ios) {
    return (
      <div className={mobile
        ? 'flex h-[54px] min-w-0 items-center gap-2 rounded-2xl border border-white/[0.13] bg-white/[0.065] px-3 backdrop-blur-xl'
        : 'flex items-center gap-2 text-xs text-[#bbbbbb]'
      } role="group" aria-label={label}>
        <button
          type="button"
          onClick={toggleMute}
          className="grid h-11 w-10 shrink-0 place-items-center rounded-xl text-white/90 active:bg-white/15"
          aria-label={muted ? (rtl ? 'تشغيل الصوت' : 'Unmute') : (rtl ? 'كتم الصوت' : 'Mute')}
          aria-pressed={muted}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <span className="min-w-0 text-[11px] leading-tight text-[#d5d5d5]">
          {rtl ? 'علّي ووطّي من أزرار التليفون' : 'Adjust using phone volume buttons'}
        </span>
      </div>
    );
  }

  return (
    <div className={mobile
      ? 'oddio-glass-volume flex min-w-0 items-center gap-1 rounded-2xl border border-white/[0.13] bg-white/[0.065] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-xl'
      : 'flex shrink-0 items-center justify-center gap-2'
    } role="group" aria-label={label}>
      <button type="button" onClick={toggleMute}
        className={mobile
          ? 'grid h-11 w-10 shrink-0 place-items-center rounded-xl text-[#eeeeee] transition active:bg-white/15'
          : 'rounded-full p-1.5 text-muted transition hover:bg-white/10 hover:text-white'
        }
        aria-label={muted || volume === 0 ? (rtl ? 'تشغيل الصوت' : 'Unmute') : (rtl ? 'كتم الصوت' : 'Mute')}>
        {muted || volume === 0
          ? <VolumeX className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
          : <Volume2 className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />}
      </button>
      <div className={mobile ? 'relative flex h-12 min-w-0 flex-1 items-center' : 'min-w-0'}>
        <input ref={sliderRef} type="range" min="0" max="100" step="1"
          defaultValue={pct}
          onInput={(event) => updateFromInput(event.currentTarget)}
          onChange={(event) => updateFromInput(event.currentTarget)}
          onPointerUp={finishDrag}
          onBlur={finishDrag}
          className={mobile ? 'oddio-glass-volume-slider w-full' : 'w-12 sm:w-20 xl:w-24'}
          style={{ '--oddio-volume-progress': `${pct}%` } as CSSProperties}
          aria-label={rtl ? 'مستوى الصوت' : 'Volume level'}
          title={label}
        />
      </div>
      {mobile ? (
        <output ref={outputRef} className="w-7 shrink-0 text-center text-[11px] font-semibold tabular-nums text-[#d6d6d6]" aria-live="off">
          {pct}
        </output>
      ) : null}
    </div>
  );
}
