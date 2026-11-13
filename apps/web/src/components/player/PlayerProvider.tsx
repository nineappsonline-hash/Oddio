'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaybackEventInput } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { usePlayer } from '@/lib/player-store';
import { PLAYER_SESSION_KEY, buildPlayerSession, parsePlayerSession } from '@/lib/player-session';
import type { CatalogTrack, HomeData } from '@/lib/data/queries';
import { useToast } from '@/components/providers/ToastProvider';

interface PlaybackAuthorization {
  sessionId: string;
  streamUrl: string;
  durationMs: number;
  trackId: string;
}

export function PlayerProvider({ children, viewerId }: { children: React.ReactNode; viewerId: string | null }) {
  const storageKey = `${PLAYER_SESSION_KEY}:${viewerId ?? 'guest'}`;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionRef = useRef<string | null>(null);
  const audibleRef = useRef({
    accumulated: 0,
    lastTime: 0,
    qualified: false,
    lastSent: 0,
  });
  const [stream, setStream] = useState<string | null>(null);
  const { toast } = useToast();
  const track = usePlayer((state) => state.track);
  const trackId = track?.id;
  const playbackRequestId = usePlayer((state) => state.playbackRequestId);
  const pendingRestoreTime = useRef<number | null>(null);
  const pendingRestoreTrackId = useRef<string | null>(null);
  const startSentRef = useRef(false);
  const isPlaying = usePlayer((state) => state.isPlaying);
  const volume = usePlayer((state) => state.volume);
  const muted = usePlayer((state) => state.muted);
  const seekRequest = usePlayer((state) => state.seekRequest);

  // Keep the current queue and preferences in this tab. Restoring never
  // automatically starts audio: playback always needs a user gesture.
  useEffect(() => {
    try {
      const session = parsePlayerSession(window.sessionStorage.getItem(storageKey));
      if (session) {
        pendingRestoreTime.current = session.currentTime;
        pendingRestoreTrackId.current = session.track?.id ?? null;
        usePlayer.setState({
          track: session.track,
          queue: session.queue,
          history: [],
          currentTime: session.currentTime,
          duration: session.track?.durationMs ? session.track.durationMs / 1000 : 0,
          volume: session.volume,
          muted: session.muted,
          repeat: session.repeat,
          shuffle: session.shuffle,
          autoplay: session.autoplay,
          isPlaying: false,
          expanded: false,
          error: null,
          buffering: false,
          seekRequest: null,
        });
      } else {
        usePlayer.setState({ track: null, queue: [], history: [], isPlaying: false, currentTime: 0, duration: 0, error: null, buffering: false, seekRequest: null });
      }
    } catch {
      // Browser storage might be disabled; the player works without it.
    }

    const save = () => {
      const state = usePlayer.getState();
      try {
        if (!state.track) {
          window.sessionStorage.removeItem(storageKey);
          return;
        }
        window.sessionStorage.setItem(storageKey, JSON.stringify(buildPlayerSession({
          version: 1,
          track: state.track,
          queue: state.queue,
          currentTime: state.currentTime,
          volume: state.volume,
          muted: state.muted,
          repeat: state.repeat,
          shuffle: state.shuffle,
          autoplay: state.autoplay,
        })));
      } catch {
        // Browsers can reject storage writes in private or restricted contexts.
      }
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = usePlayer.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 400);
    });
    window.addEventListener('pagehide', save);
    return () => {
      if (timer) clearTimeout(timer);
      save();
      unsubscribe();
      window.removeEventListener('pagehide', save);
    };
  }, [storageKey]);

  const sendEvent = useCallback(
    (eventType: PlaybackEventInput['eventType'], audibleMs: number) => {
      const state = usePlayer.getState();
      if (!state.track || !sessionRef.current) return;
      const payload: PlaybackEventInput = {
        sessionId: sessionRef.current,
        trackId: state.track.id,
        eventType,
        audibleMs: Math.round(audibleMs),
        requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
      void apiRequest('/api/playback/events', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).catch(() => undefined);
    },
    [],
  );

  useEffect(() => {
    if (!trackId) return;
    let cancelled = false;
    const state = usePlayer.getState();
    state.setError(null);
    state.setBuffering(true);
    sessionRef.current = null;
    startSentRef.current = false;
    setStream(null);
    audibleRef.current = { accumulated: 0, lastTime: 0, qualified: false, lastSent: 0 };

    apiRequest<PlaybackAuthorization>(`/api/tracks/${trackId}/playback`, {
      method: 'POST',
    })
      .then((result) => {
        if (cancelled) return;
        sessionRef.current = result.sessionId;
        setStream(result.streamUrl);
        usePlayer.getState().setDuration(result.durationMs / 1000);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : 'Playback is not available.';
        usePlayer.getState().setError(message);
        usePlayer.getState().setBuffering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trackId, playbackRequestId, sendEvent]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!stream) {
      audio.removeAttribute('src');
      return;
    }
    audio.src = stream;
    audio.load();
    if (usePlayer.getState().isPlaying) {
      void audio.play().catch(() => {
        usePlayer.getState().setPlaying(false);
      });
    }
  }, [stream]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stream) return;
    if (isPlaying) {
      void audio.play().catch(() => {
        usePlayer.getState().setPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, stream]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !seekRequest) return;
    const duration = Number.isFinite(audio.duration)
      ? audio.duration
      : seekRequest.seconds;
    audio.currentTime = Math.min(Math.max(seekRequest.seconds, 0), duration || 0);
    audibleRef.current.lastTime = audio.currentTime;
    usePlayer.getState().setCurrentTime(audio.currentTime);
  }, [seekRequest]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const state = usePlayer.getState();
      const time = audio.currentTime;
      const audible = audibleRef.current;
      const delta = time - audible.lastTime;
      if (!audio.paused && delta > 0 && delta < 1.5) {
        audible.accumulated += delta * 1000;
      }
      audible.lastTime = time;
      state.setCurrentTime(time);
      const threshold = Math.min(30_000, state.track?.durationMs ?? 30_000);
      if (!audible.qualified && threshold > 0 && audible.accumulated >= threshold) {
        audible.qualified = true;
        sendEvent('qualified', audible.accumulated);
        toast('Play counted after 30 seconds of listening.', 'success');
      }
      if (audible.accumulated - audible.lastSent >= 5000) {
        audible.lastSent = audible.accumulated;
        sendEvent('progress', audible.accumulated);
      }
    };

    const onLoaded = () => {
      // A restored seek must wait for the new stream's metadata.
      if (pendingRestoreTime.current !== null && pendingRestoreTrackId.current === usePlayer.getState().track?.id) {
        const position = pendingRestoreTime.current;
        pendingRestoreTime.current = null;
        pendingRestoreTrackId.current = null;
        const maximum = Number.isFinite(audio.duration) ? audio.duration : position;
        audio.currentTime = Math.min(Math.max(position, 0), maximum || 0);
        usePlayer.getState().setCurrentTime(audio.currentTime);
        audibleRef.current.lastTime = audio.currentTime;
      }
      pendingRestoreTime.current = null;
      pendingRestoreTrackId.current = null;
      usePlayer.getState().setBuffering(false);
      if (Number.isFinite(audio.duration)) {
        usePlayer.getState().setDuration(audio.duration);
      }
    };
    const onWaiting = () => usePlayer.getState().setBuffering(true);
    const onPlaying = () => {
      usePlayer.getState().setBuffering(false);
      if (!startSentRef.current && sessionRef.current) {
        startSentRef.current = true;
        sendEvent('start', 0);
      }
    };
    const onError = () => {
      usePlayer.getState().setBuffering(false);
      usePlayer.getState().setError('Playback failed. Try again.');
    };
    const onEnded = () => {
      const state = usePlayer.getState();
      sendEvent('complete', audibleRef.current.accumulated);
      if (state.repeat === 'one') {
        audio.currentTime = 0;
        state.seek(0);
        void audio.play().catch(() => state.setPlaying(false));
        return;
      }
      const advanced = state.advance();
      if (!advanced && state.autoplay) {
        void apiRequest<HomeData>('/api/home')
          .then((home) => {
            const currentId = usePlayer.getState().track?.id;
            const pool: CatalogTrack[] = [...home.trending, ...home.latest].filter(
              (item) => item.id !== currentId,
            );
            const first = pool[0];
            if (first) {
              usePlayer.getState().play(first, pool.slice(1));
            }
          })
          .catch(() => undefined);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
    };
  }, [sendEvent, toast]);

  useEffect(() => {
    if (!track || typeof navigator === 'undefined' || !('mediaSession' in navigator))
      return;
    const mediaSession = navigator.mediaSession;
    try {
      mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist?.name ?? 'Oddio',
        album: 'Oddio',
      });
      mediaSession.setActionHandler('play', () => usePlayer.getState().setPlaying(true));
      mediaSession.setActionHandler('pause', () =>
        usePlayer.getState().setPlaying(false),
      );
      mediaSession.setActionHandler('previoustrack', () =>
        usePlayer.getState().previous(),
      );
      mediaSession.setActionHandler('nexttrack', () => usePlayer.getState().next());
      mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number')
          usePlayer.getState().seek(details.seekTime);
      });
    } catch {
      // Media Session is best-effort.
    }
  }, [track]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!usePlayer.getState().track) return;
      event.preventDefault();
      usePlayer.getState().toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {children}
      <audio ref={audioRef} preload="none" aria-hidden="true" />
    </>
  );
}
