import {jsonError,jsonOk} from '@/lib/api-helpers';
import {serviceClient} from '@/lib/data/supabase-store';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const {data,error}=await serviceClient().from('tracks').select('synced_lyrics_srt,publish_status,visibility').eq('id',id).single();
  if(error||!data||data.publish_status!=='published'||data.visibility!=='public')return jsonOk({srt:null});
  return jsonOk({srt:data.synced_lyrics_srt||null});
 }catch(error){return jsonError(error)}
}
