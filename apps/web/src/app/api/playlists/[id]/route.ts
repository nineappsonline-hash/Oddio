import { z } from 'zod';
import { mutateRuntimeDb } from '@/lib/data/runtime-store';
import { deletePlaylist, updatePlaylist } from '@/lib/data/mutations';
import { demoMode } from '@/lib/env';
import { updatePlaylistDirect, deletePlaylistDirect } from '@/lib/data/playlist-direct';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const input = await parseBody(request, patchSchema);
    const playlist = demoMode
      ? await mutateRuntimeDb((db) => updatePlaylist(db, user, id, input))
      : await updatePlaylistDirect(user, id, input);
    return jsonOk({ playlist });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    if (demoMode) {
      await mutateRuntimeDb((db) => deletePlaylist(db, user, id));
    } else {
      await deletePlaylistDirect(user, id);
    }
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
