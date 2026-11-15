import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { getSessionUser } from '@/lib/auth/session';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { RoomLobby } from '@/components/rooms/RoomLobby';

export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  const safeLocale:Locale=isLocale(locale)?locale:'en';
  return buildMetadata({locale:safeLocale,title:safeLocale==='ar'?'غرف الاستماع':'Listening rooms',
    description:'Join a private music listening room.',path:'/rooms',noindex:true});
}
export default async function RoomsPage({params}:{params:Promise<{locale:string}>}){
  const {locale:raw}=await params;
  if(!isLocale(raw))redirect('/en');
  const user=await getSessionUser();
  if(!user)redirect(`/${raw}/login?next=${encodeURIComponent(`/${raw}/rooms`)}`);
  return <main className="space-y-7 pb-20">
    <header>
      <p className="text-xs font-bold uppercase tracking-widest text-primary">ODDIO TOGETHER</p>
      <h1 className="mt-2 text-3xl font-black">{raw==='ar'?'اسمعوا سوا':'Listen together'}</h1>
      <p className="mt-2 text-sm text-muted">
        {raw==='ar'?'غرف بدعوات خاصة وتشغيل متزامن عبر نفس مشغل Oddio.':'Invite-only music rooms synced through the existing Oddio player.'}
      </p>
    </header>
    <RoomLobby locale={raw}/>
    <Link href={`/${raw}/discover`} className="inline-block text-sm text-primary hover:underline">
      {raw==='ar'?'اكتشف الموسيقى':'Discover music'}
    </Link>
  </main>;
}
