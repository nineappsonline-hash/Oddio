import { getSessionUser } from '@/lib/auth/session';
import { assertSameOrigin, jsonError, jsonOk, rateLimit } from '@/lib/api-helpers';
import { Errors } from '@/lib/errors';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';

export const runtime = 'nodejs';
const BUCKET = 'track-artwork';
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    if (demoMode) throw Errors.invalid('Production artwork endpoint only');
    const user = await getSessionUser();
    if (!user || !user.isArtistManager) throw Errors.forbidden();
    rateLimit(`artwork:${user.id}`, 15, 60 * 60_000);
    const { id } = await context.params;
    if (!/^[a-f0-9-]{36}$/i.test(id)) throw Errors.invalid('Invalid track id');
    const db = serviceClient();
    const { data: track, error: trackError } = await db
      .from('tracks')
      .select('id,artist_id')
      .eq('id', id)
      .single();
    if (trackError || !track) throw Errors.notFound('Track not found');
    const { data: artist, error: artistError } = await db
      .from('artists')
      .select('owner_user_id')
      .eq('id', track.artist_id)
      .single();
    if (artistError || !artist || artist.owner_user_id !== user.id)
      throw Errors.forbidden();
    const form = await request.formData();
    const file = form.get('artwork');
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > MAX_BYTES ||
      !TYPES[file.type]
    ) {
      throw Errors.invalid('Artwork must be PNG, JPEG, WEBP or GIF, under 5 MB');
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const valid =
      file.type === 'image/png'
        ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : file.type === 'image/jpeg'
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : file.type === 'image/gif'
            ? bytes.subarray(0, 4).toString() === 'GIF8'
            : bytes.subarray(0, 4).toString() === 'RIFF' &&
              bytes.subarray(8, 12).toString() === 'WEBP';
    if (!valid) throw Errors.invalid('Artwork file does not match its image type');
    const key = `${id}/cover.${TYPES[file.type]}`;
    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(key, bytes, { contentType: file.type, upsert: true, cacheControl: '60' });
    if (uploadError) throw new Error(`Artwork storage failed: ${uploadError.message}`);
    const oldKeys = ['png', 'jpg', 'webp', 'gif']
      .filter((ext) => ext !== TYPES[file.type])
      .map((ext) => `${id}/cover.${ext}`);
    await db.storage.from(BUCKET).remove(oldKeys);
    const artworkUrl = `/api/studio/tracks/${id}/artwork`;
    const { error: updateError } = await db
      .from('tracks')
      .update({ artwork_key: artworkUrl })
      .eq('id', id);
    if (updateError) throw new Error(`Unable to attach artwork: ${updateError.message}`);
    return jsonOk({ artworkUrl });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!/^[a-f0-9-]{36}$/i.test(id)) throw Errors.notFound('Artwork not found');
    const db = serviceClient();
    const { data: track } = await db
      .from('tracks')
      .select('artwork_key')
      .eq('id', id)
      .single();
    if (track?.artwork_key !== `/api/studio/tracks/${id}/artwork`)
      throw Errors.notFound('Artwork not found');
    for (const ext of ['png', 'jpg', 'webp', 'gif']) {
      const { data, error } = await db.storage
        .from(BUCKET)
        .download(`${id}/cover.${ext}`);
      if (!error && data)
        return new Response(data, {
          headers: {
            'Content-Type': data.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            'Cache-Control': 'public, max-age=60',
          },
        });
    }
    throw Errors.notFound('Artwork not found');
  } catch (error) {
    return jsonError(error);
  }
}
