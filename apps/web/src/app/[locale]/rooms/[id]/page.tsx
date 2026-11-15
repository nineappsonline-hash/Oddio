import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { RoomSession } from '@/components/rooms/RoomSession';

export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale}=await params;
  const safeLocale:Locale=isLocale(locale)?locale:'en';
  return buildMetadata({locale:safeLocale,title:safeLocale==='ar'?'غرفة استماع خاصة':'Private listening room',
    description:'Invite-only group listening.',path:'/rooms',noindex:true});
}
export default async function RoomPage({params}:{params:Promise<{locale:string;id:string}>}){
  const {locale:raw,id}=await params;
  if(!isLocale(raw))redirect('/en');
  const user=await getSessionUser();
  if(!user)redirect(`/${raw}/login?next=${encodeURIComponent(`/${raw}/rooms/${id}`)}`);
  if(!/^[a-f0-9-]{36}$/i.test(id))redirect(`/${raw}/rooms`);
  return <main className="pb-20"><RoomSession roomId={id} locale={raw}/></main>;
}
