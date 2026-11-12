import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { presignR2OriginalGet, presignR2Get } from '@/lib/storage/r2-presign';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
    const { id } = await context.params;
    const db = demoMode ? readDb() : await loadDbFromSupabase();
    const track = db.tracks.find((item) => item.id === id);
    if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    const ownsTrack = db.artists.some((artist) => artist.id === track.artistId && artist.ownerUserId === user.id);
    if (!ownsTrack && !user.roles.some((role) => role === 'admin' || role === 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!track.audio?.objectKey || demoMode) {
      return NextResponse.json({ error: 'Audio unavailable' }, { status: 404 });
    }
    const key = track.audio.objectKey;
    const url = key.startsWith('incoming/') ? presignR2OriginalGet(key) : presignR2Get(key);
    return NextResponse.redirect(url, {
      status: 307,
      headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
    });
  } catch {
    return NextResponse.json({ error: 'Preview unavailable' }, { status: 500 });
  }
}
