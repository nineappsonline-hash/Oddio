import { artistProfileInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { createArtist } from '@/lib/data/mutations';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  rateLimit,
  requireUser,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`artist:create:${user.id}`, 10, 60 * 60_000);
    const input = await parseBody(request, artistProfileInput);
    const artist = mutateDb((db) =>
      createArtist(db, user, {
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
