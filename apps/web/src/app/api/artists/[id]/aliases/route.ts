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
import { mutateDb } from '@/lib/data/db';
import { serviceClient } from '@/lib/data/supabase-store';
import { Errors } from '@/lib/errors';

export const runtime = 'nodejs';

const inputSchema = z.object({
  aliases: z.array(z.string().trim().min(2).max(80)).max(8),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    rateLimit(`artist:aliases:${user.id}`, 10, 60 * 60 * 1000);
    const input = await parseBody(request, inputSchema);
    const aliases = [...new Set(input.aliases.map((alias) => alias.normalize('NFKC')))]
      .filter((alias) => !/[\u0000-\u001f\u007f]/.test(alias))
      .slice(0, 8);
    if (aliases.length !== input.aliases.length) {
      throw Errors.invalid('Aliases must be unique and contain no control characters.');
    }

    if (demoMode) {
      const artist = mutateDb((db) => {
        const current = db.artists.find((candidate) => candidate.id === id);
        if (!current) throw Errors.notFound('Artist not found');
        if (current.ownerUserId !== user.id) throw Errors.forbidden();
        current.searchAliases = aliases;
        return current;
      });
      return jsonOk({ aliases: artist.searchAliases ?? [] });
    }

    const { data: owned, error: checkError } = await serviceClient()
      .from('artists')
      .select('id')
      .eq('id', id)
      .eq('owner_user_id', user.id)
      .maybeSingle();
    if (checkError) throw new Error(checkError.message);
    if (!owned) throw Errors.notFound('Artist not found');

    const { data, error } = await serviceClient()
      .from('artists')
      .update({ search_aliases: aliases })
      .eq('id', id)
      .eq('owner_user_id', user.id)
      .select('search_aliases')
      .single();
    if (error) throw new Error(error.message);
    return jsonOk({ aliases: data.search_aliases as string[] });
  } catch (error) {
    return jsonError(error);
  }
}
