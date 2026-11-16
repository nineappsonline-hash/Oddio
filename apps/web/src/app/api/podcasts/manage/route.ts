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
  action: z.literal('show'), title:z.string().trim().min(2).max(160),
  slug, author:z.string().trim().min(2).max(140),
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
});
const publishInput = z.object({action:z.literal('publish'),episodeId:z.string().uuid()});
const inputSchema = z.discriminatedUnion('action',[showInput,episodeInput,publishInput]);

export async function POST(request:Request) {
  const user=await getSessionUser();
  if(!user || !user.roles.some(r=>r==='admin'||r==='super_admin')) {
    return NextResponse.json({error:'Not authorized'}, {status:403});
  }
  if(demoMode) return NextResponse.json({error:'Database not configured'}, {status:503});
  const json:unknown=await request.json().catch(()=>null);
  const parsed=inputSchema.safeParse(json);
  if(!parsed.success) return NextResponse.json({error:'Invalid podcast details',fields:parsed.error.flatten()}, {status:422});
  const data=parsed.data;
  const db=serviceClient();
  try {
    if(data.action==='show') {
      const {data:category}=await db.from('podcast_categories').select('id').eq('id',data.categoryId).eq('active',true).maybeSingle();
      if(!category) return NextResponse.json({error:'Select a valid podcast category'}, {status:422});
      const {data:show,error}=await db.from('podcast_shows').insert({
        title:data.title,slug:data.slug,author_name:data.author,category_id:data.categoryId,
        description:data.description,language_code:data.language,cover_url:data.coverUrl||null,
        status:'published',owner_id:user.id,
      }).select('id,slug').single();
      if(error || !show) return NextResponse.json({error:error?.message||'Unable to create show'},{status:422});
      return NextResponse.json({show});
    }
    if(data.action==='episode') {
      const {data:show}=await db.from('podcast_shows').select('id').eq('id',data.showId).eq('status','published').maybeSingle();
      if(!show) return NextResponse.json({error:'Podcast show is not published'}, {status:404});
      const episodeId=randomUUID(), key=`podcasts/${episodeId}.mp3`;
      const {error}=await db.from('podcast_episodes').insert({
        id:episodeId,show_id:data.showId,slug:data.slug,title:data.title,
        description:data.description,duration_seconds:data.durationSeconds,
        audio_object_key:key,status:'draft',
      });
      if(error) return NextResponse.json({error:error.message},{status:422});
      return NextResponse.json({episodeId,uploadUrl:presignR2StreamingPut(key),key});
    }
    if(!isPodcastId(data.episodeId)) return NextResponse.json({error:'Invalid episode'},{status:422});
    const {data:episode}=await db.from('podcast_episodes')
      .select('id,show_id,status,audio_object_key').eq('id',data.episodeId).maybeSingle();
    if(!episode || episode.status!=='draft' || !episode.audio_object_key) return NextResponse.json({error:'Episode not in draft state'}, {status:404});
    const {data:show}=await db.from('podcast_shows').select('id').eq('id',episode.show_id).eq('status','published').maybeSingle();
    if(!show) return NextResponse.json({error:'Podcast show is not published'}, {status:404});

    // Verify that Cloudflare has the uploaded audio before making it public.
    // Range fetch avoids pulling the entire podcast through Vercel.
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    let valid=false;
    try {
      const response=await fetch(presignR2Get(episode.audio_object_key),{
        headers:{Range:'bytes=0-0'},signal:controller.signal,cache:'no-store',
      });
      valid=response.status===206 && !!response.headers.get('content-range');
      await response.body?.cancel();
    } finally {clearTimeout(timeout);}
    if(!valid) return NextResponse.json({error:'Audio upload has not been verified on Cloudflare R2'},{status:409});
    const {error}=await db.from('podcast_episodes')
      .update({status:'published',published_at:new Date().toISOString(),updated_at:new Date().toISOString()})
      .eq('id',episode.id).eq('status','draft');
    if(error) return NextResponse.json({error:error.message},{status:422});
    return NextResponse.json({published:true,episodeId:episode.id});
  } catch {
    return NextResponse.json({error:'Podcast publishing is unavailable. Confirm migration and R2 configuration.'},{status:503});
  }
}
