import { createClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PUT } from './route';

const session = vi.hoisted(() => ({ user: null as { id: string } | null }));
const database = vi.hoisted(() => ({ fetch: vi.fn<typeof fetch>() }));
vi.mock('@/lib/auth/session', () => ({ getSessionUser: () => session.user }));
vi.mock('@/lib/env', () => ({ demoMode: false, env: {} }));
vi.mock('@/lib/data/supabase-store', () => ({
  serviceClient: () =>
    createClient('https://fixture.invalid', 'test-service-only', {
      global: { fetch: database.fetch },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
}));

const playlist = (title: string) => [
  { id: 'test-list', title, genreId: '', moodId: '', likedOnly: true },
];
const rows = new Map<
  string,
  { rules: ReturnType<typeof playlist>; updated_at: string }
>();
function save(expectedUpdatedAt: string | null, title: string, accountId = 'listener-a') {
  return PUT(
    new Request('https://oddio.test/api/library/smart-playlists', {
      method: 'PUT',
      body: JSON.stringify({ accountId, expectedUpdatedAt, rules: playlist(title) }),
    }),
  );
}
async function read() {
  const response = await GET();
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(response.status).toBe(200);
  return (await response.json()).data;
}

describe('smart playlist account route', () => {
  beforeEach(() => {
    session.user = { id: 'listener-a' };
    rows.clear();
    database.fetch.mockReset().mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      const filter = (key: string) => url.searchParams.get(key)?.replace(/^eq\./, '');
      const selection = filter('user_id');
      const row = selection ? rows.get(selection) : undefined;
      if (init?.method === 'GET') return Response.json(row ? [row] : []);
      const body = JSON.parse(String(init?.body));
      if (init?.method === 'POST') {
        if (rows.has(body.user_id))
          return Response.json(
            { code: '23505', message: 'duplicate key' },
            { status: 409 },
          );
        rows.set(body.user_id, body);
        return Response.json({ updated_at: body.updated_at });
      }
      expect(init?.method).toBe('PATCH');
      expect(selection).toBeDefined();
      expect(filter('updated_at')).toBeDefined();
      if (!row || row.updated_at !== filter('updated_at')) return Response.json([]);
      rows.set(selection!, body);
      return Response.json([{ updated_at: body.updated_at }]);
    });
  });

  it('loads and saves a private account version, rejecting a stale update and duplicate creation', async () => {
    expect(await read()).toMatchObject({
      accountId: 'listener-a',
      rules: [],
      updatedAt: null,
    });
    const create = await save(null, 'Original');
    expect(create.status).toBe(200);
    const original = await read();
    expect(original.rules).toEqual(playlist('Original'));
    expect((await save(null, 'Other device tried to initialize')).status).toBe(409);
    expect((await save(original.updatedAt, 'Newer account copy')).status).toBe(200);
    const stale = await save(original.updatedAt, 'Stale device');
    expect(stale.status).toBe(409);
    expect(stale.headers.get('Cache-Control')).toBe('private, no-store');
    expect((await read()).rules).toEqual(playlist('Newer account copy'));
  });

  it('does not allow a tab from the previous release to overwrite without a version', async () => {
    expect((await save(null, 'Account copy')).status).toBe(200);
    const before = await read();
    const response = await PUT(
      new Request('https://oddio.test/api/library/smart-playlists', {
        method: 'PUT',
        body: JSON.stringify({ rules: playlist('Unversioned legacy edit') }),
      }),
    );
    expect(response.status).toBe(422);
    expect(await read()).toEqual(before);
  });

  it('does not leak another account or write after the signed-in account has changed', async () => {
    expect((await save(null, 'Private list')).status).toBe(200);
    session.user = { id: 'listener-b' };
    expect(await read()).toMatchObject({ accountId: 'listener-b', rules: [] });
    expect((await save(null, 'Stale tab')).status).toBe(403);
    expect(await read()).toMatchObject({ accountId: 'listener-b', rules: [] });
    session.user = null;
    expect((await GET()).status).toBe(401);
    expect((await save(null, 'Guest write')).status).toBe(401);
  });
});
