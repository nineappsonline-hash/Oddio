import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-helpers';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { presignR2OriginalGet, presignR2Get } from '@/lib/storage/r2-presign';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(['admin', 'super_admin']);
    const { id } = await context.params;
    const db = demoMode ? readDb() : await loadDbFromSupabase();
    const track = db.tracks.find((item) => item.id === id);
    if (!track?.audio) {
      return NextResponse.json({ error: 'Audio unavailable' }, { status: 404 });
    }
    if (demoMode) {
      return NextResponse.json({ error: 'Demo preview unavailable' }, { status: 409 });
    }
    const key = track.audio.objectKey;
    const url = key.startsWith('incoming/')
      ? presignR2OriginalGet(key)
      : presignR2Get(key);
    return NextResponse.redirect(url, {
      status: 307,
      headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
    });
  } catch {
    return NextResponse.json({ error: 'Not authorized or preview unavailable' }, { status: 403 });
  }
}
