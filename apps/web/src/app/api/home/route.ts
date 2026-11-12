import { getViewer } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getHomeData } from '@/lib/data/queries';
import { jsonError, jsonOk } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const viewer = await getViewer();
    return jsonOk(getHomeData(readDb(), viewer));
  } catch (error) {
    return jsonError(error);
  }
}
