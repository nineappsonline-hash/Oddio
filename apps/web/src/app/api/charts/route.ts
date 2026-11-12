import { chartQuery } from '@ai-music/contracts';
import { getViewer } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getCharts } from '@/lib/data/queries';
import { jsonError, jsonOk } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = chartQuery.parse({
      period: url.searchParams.get('period') ?? undefined,
      country: url.searchParams.get('country') ?? undefined,
      genre: url.searchParams.get('genre') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    const viewer = await getViewer();
    return jsonOk(getCharts(readDb(), viewer, query));
  } catch (error) {
    return jsonError(error);
  }
}
