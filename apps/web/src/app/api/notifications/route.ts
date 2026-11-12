import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { getNotificationsData } from '@/lib/data/queries';
import { Errors } from '@/lib/errors';
import { jsonError, jsonOk } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) throw Errors.unauthorized();
    return jsonOk(getNotificationsData(readDb(), user.id));
  } catch (error) {
    return jsonError(error);
  }
}
