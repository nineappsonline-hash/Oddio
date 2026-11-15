import { z } from 'zod';
import { assertSameOrigin, jsonError, jsonOk, parseBody, rateLimit, requireUser } from '@/lib/api-helpers';
import { demoMode } from '@/lib/env';
import { loadDbFromSupabase, serviceClient } from '@/lib/data/supabase-store';
import { accessForTrack, enrichTrack } from '@/lib/data/queries';

export const runtime = 'nodejs';

const resumeInput = z.object({
  trackId: z.string().uuid(),
  queueTrackIds: z.array(z.string().uuid()).max(50),
  currentTime: z.number().finite().min(0).max(14400),
  volume: z.number().finite().min(0).max(1),
  muted: z.boolean(),
  repeat: z.enum(['off', 'one', 'all']),
  shuffle: z.boolean(),
  autoplay: z.boolean(),
});

export async function GET() {
  try {
    const user = await requireUser();
    if (demoMode) return jsonOk({ session: null });
    const { data, error } = await serviceClient()
      .from('player_resume_states')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error(`Failed to read player resume state: ${error.message}`);
    if (!data || !data.track_id) return jsonOk({ session: null });
    const db = await loadDbFromSupabase();
    const viewer = { userId: user.id, roles: user.roles };
    const readable = (id: string) => {
      const track = db.tracks.find((item) => item.id === id);
      return track && accessForTrack(db, track, viewer).allowed
        ? enrichTrack(db, track, viewer)
        : null;
    };
    const track = readable(data.track_id as string);
    if (!track) return jsonOk({ session: null });
    const queue = ((data.queue_track_ids ?? []) as string[])
      .map(readable)
      .filter((item): item is NonNullable<typeof item> => item !== null);
    return jsonOk({
      session: {
        version: 1 as const,
        track,
        queue,
        currentTime: Math.min(Number(data.current_time_seconds) || 0, track.durationMs / 1000),
        volume: Number(data.volume),
        muted: data.muted === true,
        repeat: data.repeat_mode,
        shuffle: data.shuffle === true,
        autoplay: data.autoplay === true,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`resume:save:${user.id}`, 40, 60_000);
    const input = await parseBody(request, resumeInput);
    if (demoMode) return jsonOk({ saved: false });
    const db = await loadDbFromSupabase();
    const viewer = { userId: user.id, roles: user.roles };
    const canAccess = (id: string): boolean => {
      const track = db.tracks.find((item) => item.id === id);
      return Boolean(track && accessForTrack(db, track, viewer).allowed);
    };
    if (!canAccess(input.trackId)) return jsonOk({ saved: false });
    const queueTrackIds = [...new Set(input.queueTrackIds)]
      .filter((id) => id !== input.trackId && canAccess(id))
      .slice(0, 50);
    const { error } = await serviceClient().from('player_resume_states').upsert({
      user_id: user.id,
      track_id: input.trackId,
      queue_track_ids: queueTrackIds,
      current_time_seconds: input.currentTime,
      volume: input.volume,
      muted: input.muted,
      repeat_mode: input.repeat,
      shuffle: input.shuffle,
      autoplay: input.autoplay,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) throw new Error(`Failed to save player resume state: ${error.message}`);
    return jsonOk({ saved: true });
  } catch (error) {
    return jsonError(error);
  }
}
