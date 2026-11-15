'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaybackEventInput } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { usePlayer } from '@/lib/player-store';
import { readDiscoveryExclusions } from '@/lib/discovery-preferences';
import {
  recoverablePlaybackPosition,
  streamRecoveryDelayMs,
} from '@/lib/player-stream-recovery';
import {
  PLAYER_SESSION_KEY,
  buildPlayerSession,
  parsePlayerSession,
} from '@/lib/player-session';
import type { CatalogTrack, HomeData } from '@/lib/data/queries';
import { useToast } from '@/components/providers/ToastProvider';

interface PlaybackAuthorization {
  sessionId: string;
  streamUrl: string;
  durationMs: number;
  trackId: string;
}

export function PlayerProvider({
  children,
  viewerId,
}: {
  children: React.ReactNode;
  viewerId: string | null;
}) {
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
  const streamRef = useRef<string | null>(null);
  const recoveryAttemptsRef = useRef(0);
  const previousAuthorizedTrackRef = useRef<string | null>(null);
  const recoveryPendingRef = useRef(false);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryGenerationRef = useRef(0);
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

  // A track change invalidates all in-flight stream refresh attempts.
  useEffect(() => {
    recoveryGenerationRef.current += 1;
    recoveryAttemptsRef.current = 0;
    recoveryPendingRef.current = false;
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    recoveryTimerRef.current = null;
    streamRef.current = null;
    return () => {
      recoveryGenerationRef.current += 1;
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    };
  }, [trackId]);

  // Keep the current queue and preferences in this tab. Restoring never
  // automatically starts audio: playback always needs a user gesture.
  useEffect(() => {
    // Signed-in listeners retain their queue across browser restarts. Guests
    // retain the original per-tab behavior to avoid persistent shared data.
    // Some privacy modes throw even when accessing the Storage getter.
    // Keep playback functional without persistence when storage is disabled.
    const storage = {
      getItem: (key: string) => {
        try {
          return (viewerId ? window.localStorage : window.sessionStorage).getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          (viewerId ? window.localStorage : window.sessionStorage).setItem(key, value);
        } catch {
          // In-memory playback keeps working.
        }
      },
      removeItem: (key: string) => {
        try {
          (viewerId ? window.localStorage : window.sessionStorage).removeItem(key);
        } catch {
          // Storage may be disabled.
        }
      },
    };
    let disposed = false;
    let localExists = false;
    try {
      const session = parsePlayerSession(storage.getItem(storageKey));
      localExists = Boolean(session);
      if (session) {
        pendingRestoreTime.current = session.currentTime;
        pendingRestoreTrackId.current = session.track?.id ?? null;
        usePlayer.setState({
          track: session.track,
          station: null,
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
        usePlayer.setState({
          track: null,
          station: null,
          queue: [],
          history: [],
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          error: null,
          buffering: false,
          seekRequest: null,
        });
      }
    } catch {
      // Browser storage might be disabled; the player works without it.
    }

    // Only fetch cloud state for a blank local session. Do not replace a
    // track manually selected while the request was in flight. Never autoplay.
    if (viewerId && !localExists) {
      void apiRequest<{ session: unknown }>('/api/player/resume')
        .then(({ session }) => {
          if (disposed || usePlayer.getState().track) return;
          const restored = parsePlayerSession(JSON.stringify(session));
          if (!restored) return;
          pendingRestoreTime.current = restored.currentTime;
          pendingRestoreTrackId.current = restored.track?.id ?? null;
          usePlayer.setState({
            track: restored.track,
            station: null,
            queue: restored.queue,
            currentTime: restored.currentTime,
            duration: (restored.track?.durationMs ?? 0) / 1000,
            volume: restored.volume,
            muted: restored.muted,
            repeat: restored.repeat,
            shuffle: restored.shuffle,
            autoplay: restored.autoplay,
            isPlaying: false,
            expanded: false,
            seekRequest: null,
          });
        })
        .catch(() => undefined);
    }

    const save = () => {
      const state = usePlayer.getState();
      try {
        if (!state.track) {
          storage.removeItem(storageKey);
          return;
        }
        storage.setItem(
          storageKey,
          JSON.stringify(
            buildPlayerSession({
              version: 1,
              track: state.track,
              queue: state.queue,
              currentTime: state.currentTime,
              volume: state.volume,
              muted: state.muted,
              repeat: state.repeat,
              shuffle: state.shuffle,
              autoplay: state.autoplay,
            }),
          ),
        );
      } catch {
        // Browsers can reject storage writes in private or restricted contexts.
      }
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cloudTimer: ReturnType<typeof setTimeout> | null = null;
    const saveCloud = () => {
      if (!viewerId) return;
      const state = usePlayer.getState();
      if (!state.track) return;
      void apiRequest('/api/player/resume', {
        method: 'PUT',
        body: JSON.stringify({
          trackId: state.track.id,
          queueTrackIds: state.queue.map((item) => item.id).slice(0, 50),
          currentTime: Math.max(0, Math.min(state.currentTime, 14400)),
          volume: state.volume,
          muted: state.muted,
          repeat: state.repeat,
          shuffle: state.shuffle,
          autoplay: state.autoplay,
        }),
      }).catch(() => undefined);
    };
    const unsubscribe = usePlayer.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 400);
      if (viewerId && !cloudTimer) {
        // Time updates fire continuously during playback. Throttle rather
        // than debounce, or a song that keeps playing would never sync.
        cloudTimer = setTimeout(() => {
          cloudTimer = null;
          saveCloud();
        }, 10_000);
      }
    });
    window.addEventListener('pagehide', save);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      if (cloudTimer) clearTimeout(cloudTimer);
      save();
      unsubscribe();
      window.removeEventListener('pagehide', save);
    };
  }, [storageKey, viewerId]);

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
    // Manual Retry is for the same track: retain the listening position and
    // accumulated progress rather than replaying from the beginning.
    const retryingSameTrack = previousAuthorizedTrackRef.current === trackId;
    if (retryingSameTrack) {
      pendingRestoreTime.current = recoverablePlaybackPosition(
        audioRef.current?.currentTime ?? Number.NaN,
        state.currentTime,
        state.duration,
      );
      pendingRestoreTrackId.current = trackId;
    } else {
      // A newly restored session already has its playback position staged.
      // Keep it until loadedmetadata seeks the media element; clear it only
      // for an unrelated user-selected track.
      if (pendingRestoreTrackId.current !== trackId) {
        pendingRestoreTime.current = null;
        pendingRestoreTrackId.current = null;
      }
      audibleRef.current = { accumulated: 0, lastTime: 0, qualified: false, lastSent: 0 };
      startSentRef.current = false;
    }
    previousAuthorizedTrackRef.current = trackId;
    state.setError(null);
    state.setBuffering(true);
    sessionRef.current = null;
    streamRef.current = null;
    setStream(null);

    apiRequest<PlaybackAuthorization>(`/api/tracks/${trackId}/playback`, {
      method: 'POST',
    })
      .then((result) => {
        if (cancelled) return;
        sessionRef.current = result.sessionId;
        streamRef.current = result.streamUrl;
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
      if (
        pendingRestoreTime.current !== null &&
        pendingRestoreTrackId.current === usePlayer.getState().track?.id
      ) {
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
      const state = usePlayer.getState();
      const currentTrackId = state.track?.id;
      // Ignore errors caused by clearing the old source during a track change.
      if (!currentTrackId || !streamRef.current || recoveryPendingRef.current) return;
      const attempt = ++recoveryAttemptsRef.current;
      const delay = streamRecoveryDelayMs(attempt);
      if (delay === null) {
        state.setBuffering(false);
        state.setError('Playback failed. Try again.');
        return;
      }

      const resumeAt = recoverablePlaybackPosition(
        audio.currentTime,
        state.currentTime,
        state.duration,
      );
      pendingRestoreTime.current = resumeAt;
      pendingRestoreTrackId.current = currentTrackId;
      recoveryPendingRef.current = true;
      state.setBuffering(true);
      const generation = recoveryGenerationRef.current;
      recoveryTimerRef.current = setTimeout(() => {
        recoveryTimerRef.current = null;
        if (
          recoveryGenerationRef.current !== generation ||
          usePlayer.getState().track?.id !== currentTrackId
        )
          return;
        void apiRequest<PlaybackAuthorization>(`/api/tracks/${currentTrackId}/playback`, {
          method: 'POST',
        })
          .then((result) => {
            if (
              recoveryGenerationRef.current !== generation ||
              usePlayer.getState().track?.id !== currentTrackId
            )
              return;
            sessionRef.current = result.sessionId;
            streamRef.current = result.streamUrl;
            recoveryPendingRef.current = false;
            setStream(result.streamUrl);
          })
          .catch(() => {
            if (
              recoveryGenerationRef.current !== generation ||
              usePlayer.getState().track?.id !== currentTrackId
            )
              return;
            recoveryPendingRef.current = false;
            usePlayer.getState().setBuffering(false);
            usePlayer.getState().setError('Playback failed. Try again.');
          });
      }, delay);
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
      if (!advanced && state.station && state.autoplay) {
        const currentId = state.track?.id;
        const station = state.station;
        const exclusions = readDiscoveryExclusions(viewerId);
        const alreadyPlayed = [
          ...state.history.map((item) => item.id),
          ...(currentId ? [currentId] : []),
          ...exclusions.trackIds,
        ].slice(-100);
        const params = new URLSearchParams({ kind: station.kind });
        if (station.seedId) params.set('seed', station.seedId);
        if (alreadyPlayed.length) params.set('exclude', alreadyPlayed.join(','));
        if (exclusions.genreIds.length)
          params.set('blockedGenres', exclusions.genreIds.join(','));
        void apiRequest<{ tracks: CatalogTrack[] }>(
          '/api/discovery/mix?' + params.toString(),
        )
          .then(async ({ tracks }) => {
            if (tracks.length > 0) return { tracks, restart: false };
            // The whole eligible catalog has been played. Start a fresh cycle,
            // but never replay the just-finished track immediately.
            const current = usePlayer.getState();
            if (
              current.track?.id !== currentId ||
              current.station?.kind !== station.kind ||
              current.station?.seedId !== station.seedId ||
              current.isPlaying ||
              !current.autoplay
            )
              return { tracks: [], restart: false };
            const restarted = new URLSearchParams(params);
            const avoid = [...exclusions.trackIds, ...(currentId ? [currentId] : [])];
            if (avoid.length)
              restarted.set('exclude', [...new Set(avoid)].slice(-100).join(','));
            else restarted.delete('exclude');
            const next = await apiRequest<{ tracks: CatalogTrack[] }>(
              '/api/discovery/mix?' + restarted.toString(),
            );
            return { tracks: next.tracks, restart: true };
          })
          .then(({ tracks, restart }) => {
            const latest = usePlayer.getState();
            if (
              latest.track?.id !== currentId ||
              latest.station?.kind !== station.kind ||
              latest.station?.seedId !== station.seedId ||
              latest.isPlaying ||
              !latest.autoplay
            )
              return;
            if (tracks.length > 0) {
              if (restart) latest.startFlow(tracks, station);
              else latest.continueStation(tracks);
            }
          })
          .catch(() => undefined);
        return;
      }
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
  }, [sendEvent, toast, viewerId]);

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
      mediaSession.setActionHandler('seekbackward', (details) => {
        const state = usePlayer.getState();
        state.seek(Math.max(0, state.currentTime - (details.seekOffset ?? 10)));
      });
      mediaSession.setActionHandler('seekforward', (details) => {
        const state = usePlayer.getState();
        state.seek(Math.min(state.duration, state.currentTime + (details.seekOffset ?? 10)));
      });
    } catch {
      // Media Session is best-effort.
    }
  }, [track]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = !track
      ? 'none'
      : isPlaying ? 'playing' : 'paused';
  }, [isPlaying, track]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const mediaSession = navigator.mediaSession;
    if (!('setPositionState' in mediaSession)) return;
    const updatePosition = () => {
      const state = usePlayer.getState();
      if (!state.track || !Number.isFinite(state.duration) || state.duration <= 0) return;
      try {
        mediaSession.setPositionState({
          duration: state.duration,
          playbackRate: 1,
          position: Math.max(0, Math.min(state.currentTime, state.duration)),
        });
      } catch {
        // Lock-screen controls are optional browser capabilities.
      }
    };
    updatePosition();
    const interval = window.setInterval(updatePosition, 1000);
    return () => window.clearInterval(interval);
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
