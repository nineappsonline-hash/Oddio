import {
  filterPodcastCatalog,
  getContentLanguagePreference,
} from '@/lib/content-language';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';
import { getPodcastCatalog } from '@/lib/podcasts/catalog';
import { PodcastCategoryCard } from '@/components/podcasts/PodcastUI';

export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'en';
  return buildMetadata({
    locale,
    path: '/podcasts/categories',
    title: locale === 'ar' ? 'تصنيفات البودكاست' : 'Podcast Categories',
    description:
      locale === 'ar'
        ? 'استكشف تصنيفات بودكاست Oddio: تكنولوجيا، أعمال، علوم، تعليم، ثقافة، قصص، رياضة والمزيد.'
        : 'Browse podcast categories on Oddio: technology, business, science, education, comedy, culture, stories, sports and more.',
  });
}
export default async function PodcastCategories({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const catalog = filterPodcastCatalog(
    await getPodcastCatalog(),
    await getContentLanguagePreference(),
  );
  return (
    <div className="space-y-7 bg-[#0a0b0d] pb-8">
      <header className="space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-[#e9e9e9]">
          {locale === 'ar' ? 'كل المواضيع' : 'ALL TOPICS'}
        </p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">
          {locale === 'ar' ? 'تصنيفات البودكاست' : 'Podcast categories'}
        </h1>
        <p className="max-w-2xl text-sm leading-8 text-[#a3a3a3]">
          {locale === 'ar'
            ? 'اختار الموضوع اللي بتحبه، واكتشف البرامج والحلقات المتاحة في كل تصنيف.'
            : 'Pick a topic you enjoy and explore all published shows and episodes in its category.'}
        </p>
      </header>
      <div className="grid grid-cols-2 items-stretch gap-2.5 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {catalog.categories.map((category) => (
          <PodcastCategoryCard key={category.slug} category={category} locale={locale} />
        ))}
      </div>
    </div>
  );
}
