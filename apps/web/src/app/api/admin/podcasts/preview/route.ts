import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';
import { presignR2Get } from '@/lib/storage/r2-presign';
export const runtime='nodejs';
export async function GET(request:Request) {
  const user=await getSessionUser();
  if(!user?.roles.some(r=>r==='admin'||r==='super_admin'))
    return new Response('Forbidden',{status:403});
  const id=new URL(request.url).searchParams.get('id')??'';
  if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Invalid episode',{status:422});
  const {data:episode}=await serviceClient().from('podcast_episodes')
    .select('audio_object_key,status').eq('id',id).maybeSingle();
  if(!episode?.audio_object_key||episode.status!=='pending_review')
    return new Response('Not found',{status:404});
  try {
    return NextResponse.redirect(presignR2Get(episode.audio_object_key),{status:307,headers:{'Cache-Control':'private, no-store'}});
  } catch {
    return new Response('Audio unavailable',{status:503});
  }
}