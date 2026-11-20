import { z } from 'zod';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
  requireUser,
} from '@/lib/api-helpers';
import { demoMode } from '@/lib/env';
import { Errors } from '@/lib/errors';
import { serviceClient } from '@/lib/data/supabase-store';
import { podcastInbox } from '@/lib/podcasts/notification-inbox';

export const runtime = 'nodejs';

const actions = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('read'),
    episodeId: z.string().uuid(),
    read: z.boolean(),
  }),
  z.object({ action: z.literal('read_all') }),
  z.object({ action: z.literal('preferences'), enabled: z.boolean() }),
]);

export async function GET() {
  try {
    const user = await requireUser();
    rateLimit(`podcast-notifications:read:${user.id}`, 60, 60_000);
    return jsonOk(await podcastInbox(user.id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`podcast-notifications:write:${user.id}`, 30, 60_000);
    const body = await parseBody(request, actions);
    if (demoMode)
      throw Errors.invalid('Podcast notifications are unavailable in demo mode.');
    const db = serviceClient();

    if (body.action === 'preferences') {
      const { error } = await db.from('podcast_notification_preferences').upsert(
        {
          user_id: user.id,
          in_app_enabled: body.enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
      if (error) throw error;
      return jsonOk(await podcastInbox(user.id));
    }

    const inbox = await podcastInbox(user.id);
    if (body.action === 'read') {
      // A user may only change read status for their own currently eligible
      // published episode notifications, never arbitrary episode IDs.
      if (!inbox.entries.some((entry) => entry.episodeId === body.episodeId)) {
        throw Errors.notFound('Podcast notification not found');
      }
      const { error } = body.read
        ? await db.from('podcast_notification_reads').upsert(
            {
              user_id: user.id,
              episode_id: body.episodeId,
              read_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,episode_id' },
          )
        : await db
            .from('podcast_notification_reads')
            .delete()
            .eq('user_id', user.id)
            .eq('episode_id', body.episodeId);
      if (error) throw error;
    } else {
      const unread = inbox.entries.filter((entry) => !entry.read);
      if (unread.length) {
        const now = new Date().toISOString();
        const { error } = await db.from('podcast_notification_reads').upsert(
          unread.map((entry) => ({
            user_id: user.id,
            episode_id: entry.episodeId,
            read_at: now,
          })),
          { onConflict: 'user_id,episode_id' },
        );
        if (error) throw error;
      }
    }
    return jsonOk(await podcastInbox(user.id));
  } catch (error) {
    return jsonError(error);
  }
}
