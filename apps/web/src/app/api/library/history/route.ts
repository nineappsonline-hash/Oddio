import { assertSameOrigin, jsonError, jsonOk, rateLimit, requireUser } from '@/lib/api-helpers';
import { demoMode } from '@/lib/env';
import { mutateDb } from '@/lib/data/db';
import { serviceClient } from '@/lib/data/supabase-store';

export const runtime = 'nodejs';

/**
 * Delete this user's raw playback sessions and their events (ON DELETE
 * CASCADE), not merely the derived library history. Anonymous sessions and
 * other users' sessions are not touched. Aggregated chart counters are kept.
 */
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`history:delete:${user.id}`, 3, 60 * 60 * 1000);

    if (demoMode) {
      const deleted = mutateDb((db) => {
        const owned = new Set(
          db.playbackSessions.filter((s) => s.userId === user.id).map((s) => s.id),
        );
        db.playbackEvents = db.playbackEvents.filter((event) => !owned.has(event.sessionId));
        db.playbackSessions = db.playbackSessions.filter((s) => !owned.has(s.id));
        db.history = db.history.filter((entry) => entry.userId !== user.id);
        return owned.size;
      });
      return jsonOk({ deletedSessions: deleted });
    }

    // One Postgres DELETE statement; the FK cascades to raw playback_events.
    // Never accept a userId from request input, even for staff accounts.
    const { data, error } = await serviceClient()
      .from('playback_sessions')
      .delete()
      .eq('user_id', user.id)
      .select('id');
    if (error) throw new Error(`Failed to erase listening history: ${error.message}`);
    return jsonOk({ deletedSessions: data?.length ?? 0 });
  } catch (error) {
    return jsonError(error);
  }
}
