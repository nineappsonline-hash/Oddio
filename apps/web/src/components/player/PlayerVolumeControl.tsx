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
export function PlayerVolumeControl({
  rtl,
  mobile = false,
  label,
}: {
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
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    );
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const pct = Math.round((muted ? 0 : volume) * 100);
  useEffect(() => {
    const slider = sliderRef.current;
    if (slider && document.activeElement !== slider) {
      // Keep the pointer-up/blur commit aligned with external mute, volume,
      // account restore or media-key updates. Otherwise blur can rewind volume
      // to the value that was present when this component first mounted.
      pendingRef.current = muted ? 0 : volume;
      slider.value = String(pct);
      slider.style.setProperty('--oddio-volume-progress', `${pct}%`);
    }
    if (outputRef.current) outputRef.current.textContent = String(pct);
  }, [pct, muted, volume]);

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

  // React wheel listeners may be passive, in which case preventDefault is
  // ignored. Attach an explicitly non-passive listener to the desktop slider
  // only, allowing normal page scrolling outside the control.
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || mobile || ios) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      const current = Number(slider.value);
      const next = Math.max(0, Math.min(100, current + (event.deltaY < 0 ? 5 : -5)));
      if (next === current) return;
      slider.value = String(next);
      slider.style.setProperty('--oddio-volume-progress', `${next}%`);
      if (outputRef.current) outputRef.current.textContent = String(next);
      pendingRef.current = next / 100;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      setVolume(next / 100);
    };
    slider.addEventListener('wheel', onWheel, { passive: false });
    return () => slider.removeEventListener('wheel', onWheel);
  }, [ios, mobile, setVolume]);

  const finishDrag = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setVolume(pendingRef.current);
  };

  if (ios) {
    return (
      <div
        className={
          mobile
            ? 'flex h-[54px] min-w-0 items-center gap-2 rounded-2xl border border-white/[0.13] bg-white/[0.065] px-3 backdrop-blur-xl'
            : 'flex items-center gap-2 text-xs text-[#bbbbbb]'
        }
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          onClick={toggleMute}
          className="grid h-11 w-10 shrink-0 place-items-center rounded-xl text-white/90 active:bg-white/15"
          aria-label={
            muted ? (rtl ? 'تشغيل الصوت' : 'Unmute') : rtl ? 'كتم الصوت' : 'Mute'
          }
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
    <div
      className={
        mobile
          ? 'oddio-glass-volume flex min-w-0 items-center gap-1 rounded-2xl border border-white/[0.13] bg-white/[0.065] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-xl'
          : 'flex shrink-0 items-center justify-center gap-2'
      }
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={toggleMute}
        className={
          mobile
            ? 'grid h-11 w-10 shrink-0 place-items-center rounded-xl text-[#eeeeee] transition active:bg-white/15'
            : 'rounded-full p-1.5 text-muted transition hover:bg-white/10 hover:text-white'
        }
        aria-label={
          muted || volume === 0
            ? rtl
              ? 'تشغيل الصوت'
              : 'Unmute'
            : rtl
              ? 'كتم الصوت'
              : 'Mute'
        }
      >
        {muted || volume === 0 ? (
          <VolumeX className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
        ) : (
          <Volume2 className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
        )}
      </button>
      <div
        className={mobile ? 'relative flex h-12 min-w-0 flex-1 items-center' : 'min-w-0'}
      >
        <input
          ref={sliderRef}
          type="range"
          min="0"
          max="100"
          step="1"
          defaultValue={pct}
          onInput={(event) => updateFromInput(event.currentTarget)}
          onChange={(event) => updateFromInput(event.currentTarget)}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onBlur={finishDrag}
          className={mobile ? 'oddio-glass-volume-slider w-full' : 'oddio-desktop-volume-slider w-12 sm:w-20 xl:w-24'}
          style={{ '--oddio-volume-progress': `${pct}%` } as CSSProperties}
          aria-label={rtl ? 'مستوى الصوت' : 'Volume level'}
          title={label}
        />
      </div>
      {mobile ? (
        <output
          ref={outputRef}
          className="w-7 shrink-0 text-center text-[11px] font-semibold tabular-nums text-[#d6d6d6]"
          aria-live="off"
        >
          {pct}
        </output>
      ) : null}
    </div>
  );
}

/** Compact mobile volume: the transport row only shows a speaker icon.
 * The slider opens on demand rather than taking a permanent extra row.
 */
export function CompactPlayerVolumeControl({
  rtl,
  label,
}: {
  rtl: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const volume = usePlayer((state) => state.volume);
  const muted = usePlayer((state) => state.muted);
  const setVolume = usePlayer((state) => state.setVolume);
  const toggleMute = usePlayer((state) => state.toggleMute);

  useEffect(() => {
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative flex shrink-0 items-center" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={label}
        aria-expanded={open}
        title={label}
        className="grid h-10 w-10 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {muted || volume === 0 ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </button>
      {open ? (
        <div
          role="group"
          aria-label={label}
          className="absolute bottom-full end-0 z-[70] mb-3 flex min-w-[190px] items-center gap-2 rounded-xl border border-white/20 bg-[#202026] px-3 py-2.5 shadow-2xl"
        >
          <button
            type="button"
            onClick={toggleMute}
            aria-label={
              muted ? (rtl ? 'تشغيل الصوت' : 'Unmute') : rtl ? 'كتم الصوت' : 'Mute'
            }
            aria-pressed={muted}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/10"
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          {ios ? (
            <span className="max-w-40 text-xs leading-relaxed text-white/75">
              {rtl
                ? 'تحكم في مستوى الصوت من أزرار الموبايل'
                : 'Use your phone volume buttons'}
            </span>
          ) : (
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round((muted ? 0 : volume) * 100)}
              onChange={(event) => setVolume(Number(event.target.value) / 100)}
              className="h-2 w-28 cursor-pointer accent-primary"
              aria-label={rtl ? 'مستوى الصوت' : 'Volume level'}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
