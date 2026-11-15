import crypto from 'node:crypto';
import type { Playlist, SessionUser } from '@ai-music/contracts';
import { Errors } from '@/lib/errors';
import { loadDbFromSupabase, serviceClient } from './supabase-store';

type EditableFields = {
  title?: string;
  description?: string;
  visibility?: 'public' | 'private';
};

/** Each operation is one SQL statement, not a full-catalog snapshot upsert. */
export async function createPlaylistDirect(
  user: SessionUser,
  input: Required<EditableFields>,
): Promise<Playlist> {
  const id = crypto.randomUUID();
  const { data, error } = await serviceClient()
    .from('playlists')
    .insert({
      id,
      owner_id: user.id,
      title: input.title.trim(),
      description: input.description.trim(),
      visibility: input.visibility,
    })
    .select('id,created_at')
    .single();
  if (error) throw new Error(`Playlist creation failed: ${error.message}`);
  return {
    id,
    ownerId: user.id,
    ownerName: user.displayName,
    title: input.title.trim(),
    description: input.description.trim(),
    visibility: input.visibility,
    coverUrl: '',
    trackIds: [],
    followers: 0,
    createdAt: data.created_at as string,
  };
}

export async function updatePlaylistDirect(
  user: SessionUser,
  playlistId: string,
  changes: EditableFields,
): Promise<Playlist> {
  const patch = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  );
  const { data, error } = await serviceClient()
    .from('playlists')
    .update(patch)
    .eq('id', playlistId)
    .eq('owner_id', user.id)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Playlist update failed: ${error.message}`);
  if (!data) throw Errors.notFound('Playlist not found');
  const playlist = (await loadDbFromSupabase()).playlists.find(
    (item) => item.id === playlistId && item.ownerId === user.id,
  );
  if (!playlist) throw Errors.notFound('Playlist not found');
  return playlist;
}

export async function deletePlaylistDirect(
  user: SessionUser,
  playlistId: string,
): Promise<void> {
  const { data, error } = await serviceClient()
    .from('playlists')
    .delete()
    .eq('id', playlistId)
    .eq('owner_id', user.id)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Playlist delete failed: ${error.message}`);
  if (!data) throw Errors.notFound('Playlist not found');
}
