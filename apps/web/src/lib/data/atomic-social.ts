import type { SessionUser } from '@ai-music/contracts';
import { Errors } from '@/lib/errors';
import { serviceClient } from './supabase-store';

type Toggle = 'like' | 'artist' | 'playlist';
const RPC = {
  like: { functionName: 'oddio_toggle_track_like', field: 'p_track_id' },
  artist: { functionName: 'oddio_toggle_artist_follow', field: 'p_artist_id' },
  playlist: { functionName: 'oddio_toggle_playlist_follow', field: 'p_playlist_id' },
} as const;

/**
 * These server-side operations use a transaction and per-user/resource lock.
 * They require the phase-1 atomic_social_interactions migration.
 * The service role key is never exposed to the browser.
 */
export async function toggleSocialAtomic(
  kind: Toggle,
  actor: SessionUser,
  resourceId: string,
): Promise<boolean> {
  const spec = RPC[kind];
  const { data, error } = await serviceClient().rpc(spec.functionName, {
    p_user_id: actor.id,
    [spec.field]: resourceId,
  });
  if (error) {
    if (error.code === 'P0002' || error.code === '23503') {
      throw Errors.notFound('Resource not found');
    }
    throw new Error(`Failed to update ${kind} in database: ${error.message}`);
  }
  if (typeof data !== 'boolean') {
    throw new Error(`Unexpected ${kind} RPC result`);
  }
  return data;
}

export async function addPlaylistTrackAtomic(
  actor: SessionUser,
  playlistId: string,
  trackId: string,
): Promise<void> {
  const { error } = await serviceClient().rpc('oddio_add_playlist_track', {
    p_user_id: actor.id,
    p_playlist_id: playlistId,
    p_track_id: trackId,
  });
  if (error) {
    if (error.code === 'P0002' || error.code === '23503') {
      throw Errors.notFound('Playlist or track not found');
    }
    throw new Error(`Failed to add track to playlist: ${error.message}`);
  }
}

export async function removePlaylistTrackAtomic(
  actor: SessionUser,
  playlistId: string,
  trackId: string,
): Promise<void> {
  const { error } = await serviceClient().rpc('oddio_remove_playlist_track', {
    p_user_id: actor.id,
    p_playlist_id: playlistId,
    p_track_id: trackId,
  });
  if (error) {
    if (error.code === 'P0002') {
      throw Errors.notFound('Playlist not found');
    }
    throw new Error(`Failed to remove track from playlist: ${error.message}`);
  }
}
