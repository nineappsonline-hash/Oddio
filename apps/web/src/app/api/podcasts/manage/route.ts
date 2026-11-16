import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { serviceClient } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { isPodcastId } from '@/lib/podcasts/catalog';
import { presignR2Get, presignR2StreamingPut } from '@/lib/storage/r2-presign';

export const runtime = 'nodejs';
const slug = z.string().trim().min(2).max(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const showInput = z.object({
  action: z.literal('show'), artistId:z.string().uuid(), title:z.string().trim().min(2).max(160),
  slug,
  categoryId:z.string().uuid(), description:z.string().trim().max(6000).default(''),
  language:z.enum(['en','ar']).default('en'),
  coverUrl:z.union([z.string().trim().url().max(1000),z.literal('')]).optional(),
});
const episodeInput = z.object({
  action:z.literal('episode'),showId:z.string().uuid(),
  title:z.string().trim().min(2).max(200),slug,
  description:z.string().trim().max(10000).default(''),
  durationSeconds:z.number().int().min(1).max(36000),
  fileBytes:z.number().int().min(1024).max(300*1024*1024),
  episodeNumber:z.number().int().min(1).max(100000).optional(),
  seasonNumber:z.number().int().min(1).max(1000).default(1),
});
const publishInput = z.object({action:z.literal('publish'),episodeId:z.string().uuid()});
const inputSchema = z.discriminatedUnion('action',[showInput,episodeInput,publishInput]);

export async function POST(request:Request) {
  const user=await getSessionUser();
  if(!user || !(user.isArtistManager || user.roles.some(r=>r==='admin'||r==='super_admin'))) {
    return NextResponse.json({error:'Not authorized'}, {status:403});
  }
  if(demoMode) return NextResponse.json({error:'Database not configured'}, {status:503});
  // This endpoint only accepts first-party, same-origin administrative actions.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Cross-origin publishing is forbidden' }, { status: 403 });
  }
  const json:unknown=await request.json().catch(()=>null);
  const parsed=inputSchema.safeParse(json);
  if(!parsed.success) return NextResponse.json({error:'Invalid podcast details',fields:parsed.error.flatten()}, {status:422});
  const data=parsed.data;
  const staff=user.roles.some(r=>r==='admin'||r==='super_admin');
  try {
    const db=serviceClient();
    if(data.action==='show') {
      const {data:category}=await db.from('podcast_categories').select('id').eq('id',data.categoryId).eq('active',true).maybeSingle();
      if(!category) return NextResponse.json({error:'Select a valid podcast category'}, {status:422});
      // A staff role alone doesn't bypass ownership: the series must reference
      // a real artist profile owned by this user (unless staff are creating
      // for an artist explicitly on the artist's behalf).
      const {data:artist}=await db.from('artists').select('id,name,owner_user_id').eq('id',data.artistId).maybeSingle();
      if(!artist || (!staff && (!user.isArtistManager || artist.owner_user_id!==user.id || !user.artistIds.includes(data.artistId)))) {
        return NextResponse.json({error:'You do not own this artist profile'}, {status:403});
      }
      const {data:show,error}=await db.from('podcast_shows').insert({
        title:data.title,slug:data.slug,category_id:data.categoryId,
        description:data.description,language_code:data.language,cover_url:data.coverUrl||null,
        author_name:artist.name,
        status:'published',owner_id:artist.owner_user_id ?? user.id,artist_id:artist.id,
      }).select('id,slug').single();
      if(error || !show) return NextResponse.json({error:error?.message||'Unable to create show'},{status:422});
      return NextResponse.json({show});
    }
    if(data.action==='episode') {
      // Check the storage connection before leaving an orphan draft.
      const episodeId=randomUUID(), key=`podcasts/${episodeId}.mp3`;
      const uploadUrl=presignR2StreamingPut(key);
      const {data:show}=await db.from('podcast_shows').select('id,owner_id,artist_id').eq('id',data.showId).eq('status','published').maybeSingle();
      if(!show || (!staff && (show.owner_id!==user.id || !show.artist_id || !user.artistIds.includes(show.artist_id)))) {
        return NextResponse.json({error:'Podcast series not owned by this artist'}, {status:403});
      }
      if(data.episodeNumber) {
        const {data:duplicate}=await db.from('podcast_episodes').select('id').eq('show_id',data.showId)
          .eq('season_number',data.seasonNumber).eq('episode_number',data.episodeNumber).limit(1);
        if(duplicate?.length) return NextResponse.json({error:'This episode number is already used in the selected season.'},{status:409});
      }
      const {error}=await db.from('podcast_episodes').insert({
        id:episodeId,show_id:data.showId,slug:data.slug,title:data.title,
        description:data.description,duration_seconds:data.durationSeconds,
        audio_object_key:key,audio_bytes:data.fileBytes,status:'draft',
        episode_number:data.episodeNumber??null,season_number:data.seasonNumber,
      });
      if(error) return NextResponse.json({error:error.message},{status:422});
      return NextResponse.json({episodeId,uploadUrl,key});
    }
    if(!isPodcastId(data.episodeId)) return NextResponse.json({error:'Invalid episode'},{status:422});
    const {data:episode}=await db.from('podcast_episodes')
      .select('id,show_id,status,audio_object_key,audio_bytes').eq('id',data.episodeId).maybeSingle();
    if(!episode || episode.status!=='draft' || !episode.audio_object_key) return NextResponse.json({error:'Episode not in draft state'}, {status:404});
    const {data:show}=await db.from('podcast_shows').select('id,owner_id,artist_id').eq('id',episode.show_id).eq('status','published').maybeSingle();
    if(!show || (!staff && (show.owner_id!==user.id || !show.artist_id || !user.artistIds.includes(show.artist_id)))) {
      return NextResponse.json({error:'Podcast series not owned by this artist'}, {status:403});
    }

    // Verify BOTH the object size and the MP3 signature on R2.
    // A signed PUT URL permits uploading bytes different from what the user
    // claimed, so trusting fileBytes alone would bypass the upload limit.
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    let valid=false;
    try {
      const response=await fetch(presignR2Get(episode.audio_object_key),{
        headers:{Range:'bytes=0-2'},signal:controller.signal,cache:'no-store',
      });
      const range=response.headers.get('content-range') ?? '';
      const match=/^bytes 0-2\/(\d+)$/.exec(range);
      const actualBytes=match ? Number(match[1]) : 0;
      const expectedBytes=Number(episode.audio_bytes);
      // Reading only 3 bytes keeps Vercel compute and egress minimal.
      const bytes=response.status===206 ? new Uint8Array(await response.arrayBuffer()) : new Uint8Array();
      const mp3Header=bytes.length===3 && (
        (bytes[0]===0x49 && bytes[1]===0x44 && bytes[2]===0x33) ||
        (bytes[0]===0xff && (bytes[1]! & 0xe0)===0xe0)
      );
      valid=Boolean(
        mp3Header &&
        Number.isFinite(actualBytes) && actualBytes>=1024 && actualBytes<=300*1024*1024 &&
        Number.isFinite(expectedBytes) && expectedBytes===actualBytes
      );
      // arrayBuffer() fully consumes and locks the response stream.
      // Calling response.body.cancel() afterwards throws ERR_INVALID_STATE,
      // incorrectly marking a successful upload verification as a 503.
    } finally {clearTimeout(timeout);}
    if(!valid) return NextResponse.json({error:'Cloudflare MP3 verification failed: check upload size, file type or R2 readiness.'},{status:409});
    const {error}=await db.from('podcast_episodes')
      .update({status:'published',published_at:new Date().toISOString(),updated_at:new Date().toISOString()})
      .eq('id',episode.id).eq('status','draft');
    if(error) return NextResponse.json({error:error.message},{status:422});
    return NextResponse.json({published:true,episodeId:episode.id});
  } catch (error) {
    // Avoid exposing storage credentials, signed URLs, or internal details in the response.
    console.error('[podcasts/manage] publishing failed', error instanceof Error ? {name:error.name,message:error.message} : 'Unknown error');
    return NextResponse.json({error:'Podcast publishing failed while checking the uploaded file. Please retry. If it continues, contact support.'},{status:503});
  }
}
