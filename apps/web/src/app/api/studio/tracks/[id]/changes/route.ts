import crypto from 'node:crypto';
import { assertSameOrigin, jsonError, jsonOk, rateLimit, requireUser } from '@/lib/api-helpers';
import { serviceClient } from '@/lib/data/supabase-store';
import { Errors } from '@/lib/errors';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 try {
  assertSameOrigin(request);
  const user = await requireUser();
  rateLimit('track-change:'+user.id, 20, 3600000);
  const { id } = await params;
  const db = serviceClient();
  const { data: track, error: trackError } = await db.from('tracks').select('id,artist_id').eq('id',id).single();
  if (trackError || !track) throw Errors.invalid('Track not found.');
  const { data: ownedArtist, error: artistError } = await db.from('artists').select('id').eq('id',track.artist_id).eq('owner_user_id',user.id).maybeSingle();
  if (artistError) throw artistError;
  if (!ownedArtist) throw Errors.forbidden();
  const form = await request.formData();
  const file = form.get('file');
  const kind = form.get('kind');
  if (!(file instanceof File) || !['srt','artwork'].includes(String(kind))) throw Errors.invalid('Choose a valid file and change type.');
  let payload: Record<string,string> = {};
  if (kind === 'srt') {
    if (file.size > 256*1024 || !/\.srt$/i.test(file.name)) throw Errors.invalid('SRT file must be 256 KB or smaller.');
    const raw = (await file.text()).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
    const blocks = raw.split(/\n\s*\n/);
    if (!blocks.length || blocks.length > 3000 || !blocks.every(block => /(?:^|\n)\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}(?:\n|$)/.test(block))) throw Errors.invalid('Invalid SRT timestamps.');
    payload = {srt_content:raw};
  } else {
    const extensions:Record<string,string> = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
    const ext = extensions[file.type];
    if (!ext || file.size > 5*1024*1024 || !file.size) throw Errors.invalid('Artwork must be PNG, JPG or WEBP under 5 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid = ext === 'png' ? bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71 : ext === 'jpg' ? bytes[0]===255 && bytes[1]===216 : bytes[0]===82 && bytes[1]===73 && bytes[2]===70 && bytes[3]===70 && bytes[8]===87 && bytes[9]===69;
    if (!valid) throw Errors.invalid('Image file contents do not match its format.');
    const key = 'pending/'+user.id+'/'+crypto.randomUUID()+'.'+ext;
    const uploaded = await db.storage.from('artwork').upload(key,bytes,{contentType:file.type,upsert:false});
    if (uploaded.error) throw uploaded.error;
    payload = {artwork_key:key};
  }
  const {data:existing} = await db.from('track_change_requests').select('id').eq('track_id',id).eq('change_type',kind).eq('status','pending').maybeSingle();
  if (existing) throw Errors.invalid('This song already has a pending request of this type.');
  const {error} = await db.from('track_change_requests').insert({track_id:id,artist_user_id:user.id,change_type:kind,status:'pending',...payload});
  if (error) throw error;
  return jsonOk({status:'pending'});
 } catch(error) { return jsonError(error); }
}
