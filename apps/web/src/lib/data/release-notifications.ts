import crypto from 'node:crypto';
import type { Notification, Track } from '@ai-music/contracts';
import type { DemoDb } from './types';

/**
 * Create one in-app release notification per eligible follower.
 * Mirrors supabase/migrations/0006_release_fanout.sql: public, approved,
 * actually-published tracks only; owners and release-alert opt-outs excluded.
 */
export function notifyFollowersOfRelease(
  db: DemoDb,
  track: Track,
  now = new Date(),
): Notification[] {
  if (
    track.publishStatus !== 'published' ||
    track.reviewStatus !== 'approved' ||
    track.visibility !== 'public' ||
    new Date(track.releaseAt).getTime() > now.getTime()
  ) {
    return [];
  }

  const artist = db.artists.find((item) => item.id === track.artistId);
  if (!artist) return [];

  const created: Notification[] = [];
  const followers = db.artistFollows.filter(
    (follow) => follow.artistId === track.artistId,
  );

  for (const follow of followers) {
    if (follow.userId === artist.ownerUserId) continue;

    const preference = db.notificationPreferences.find(
      (item) => item.userId === follow.userId,
    );
    if (preference && !preference.releaseAlerts) continue;

    const alreadyNotified = db.notifications.some(
      (notification) =>
        notification.userId === follow.userId &&
        notification.type === 'new_release' &&
        notification.payload?.trackId === track.id,
    );
    if (alreadyNotified) continue;

    const notification: Notification = {
      id: crypto.randomUUID(),
      userId: follow.userId,
      type: 'new_release',
      title: `${artist.name} released “${track.title}”`,
      body: 'An artist you follow has a new release.',
      payload: { trackId: track.id, artistId: track.artistId },
      readAt: null,
      createdAt: now.toISOString(),
    };
    db.notifications.push(notification);
    created.push(notification);
  }

  return created;
}
