import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { InstallOddio } from '@/components/pwa/InstallOddio';

export async function generateMetadata({params}:{
  params:Promise<{locale:string}>;
}) {
  const {locale}=await params;
  const safeLocale:Locale=isLocale(locale)?locale:'en';
  return buildMetadata({
    locale:safeLocale,
    title:safeLocale==='ar'?'ثبّت Oddio على الموبايل':'Install Oddio',
    description:'Install the Oddio music web app on your phone.',
    path:'/install',
  });
}

export default async function InstallPage({params}:{
  params:Promise<{locale:string}>;
}){
  const {locale:raw}=await params;
  if(!isLocale(raw)) redirect('/en');
  const ar=raw==='ar';
  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-20">
      <InstallOddio locale={raw}/>
      <Link href={`/${raw}/discover`}
        className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm text-muted hover:text-white">
        {ar?'اكتشف الموسيقى ←':'← Discover music'}
      </Link>
    </main>
  );
}
