import { artistProfileInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { updateArtist } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const input = await parseBody(request, artistProfileInput);
    const artist = mutateDb((db) =>
      updateArtist(db, user, id, {
        name: input.name,
        slug: input.slug,
        bio: input.bio,
        accent: input.accent,
        socialLinks: input.socialLinks,
      }),
    );
    return jsonOk({ artist });
  } catch (error) {
    return jsonError(error);
  }
}
