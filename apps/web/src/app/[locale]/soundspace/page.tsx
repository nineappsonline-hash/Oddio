import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { listableTracks } from '@/lib/data/queries';
import { readDb } from '@/lib/data/db';
import { loadDbFromSupabase } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { getViewer } from '@/lib/auth/session';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { SoundspaceStudio } from '@/components/soundspace/SoundspaceStudio';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  return buildMetadata({
    locale,
    title:
      locale === 'ar'
        ? 'مساحتك الموسيقية — Soundspace'
        : 'Soundspace — find your next sound',
    description:
      locale === 'ar'
        ? 'اختار المود ودرجة الاكتشاف وشغّل ميكس مناسب لك.'
        : 'Tune your mood and discovery dial to start an explainable mix.',
    path: '/soundspace',
  });
}

export default async function SoundspacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const viewer = await getViewer();
  const db = demoMode ? readDb() : await loadDbFromSupabase();
  // Listable-track access checks must run before any client-side personalization.
  const tracks = listableTracks(db, viewer);
  return <SoundspaceStudio tracks={tracks} />;
}
