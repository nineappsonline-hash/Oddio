import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { isLocale } from '@/i18n/config';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : 'en';
  return buildMetadata({
    locale,
    title: locale === 'ar' ? 'للفنانين على Oddio' : 'For AI Music Artists',
    description:
      locale === 'ar'
        ? 'تعرّف على طريقة نشر الأغاني بالذكاء الاصطناعي على Oddio.'
        : 'Learn how artists can submit original AI music to Oddio.',
    path: '/for-artists',
  });
}

export default async function ForArtistsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === 'ar';
  const stages = ar
    ? [
        [
          'قدّم كفنان',
          'ابدأ بتقديم طلب انضمامك كفنان إلى Oddio. هتحتاج حساب علشان تتابع حالة الطلب.',
        ],
        [
          'اتبع متطلبات المحتوى',
          'الأغاني لازم تلتزم بسياسة نشر الموسيقى وحقوق الاستخدام، وطلبات النشر بتمر بمراجعة قبل إتاحتها للاستماع.',
        ],
        [
          'أدر إصداراتك',
          'بعد الموافقة على حساب الفنان، تقدر تستخدم Artist Studio لإدارة الأغاني والإصدارات ومتابعة الإحصائيات المتاحة.',
        ],
      ]
    : [
        [
          'Apply as an artist',
          'Start with an Oddio artist application. You will need an account to submit and track your application.',
        ],
        [
          'Follow music content rules',
          'Releases must follow Oddio’s publishing and rights requirements. Submitted music goes through review before it is made available to listeners.',
        ],
        [
          'Manage your releases',
          'Approved artist managers can use Artist Studio to organize songs and releases and view available listening insights.',
        ],
      ];
  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-16">
      <header className="space-y-4">
        <p className="oddio-micro-label">
          {ar ? 'لصنّاع الموسيقى' : 'FOR MUSIC CREATORS'}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-ink sm:text-5xl">
          {ar
            ? 'شارك موسيقاك بالذكاء الاصطناعي على Oddio'
            : 'Share Your AI-Generated Music on Oddio'}
        </h1>
        <p className="max-w-3xl text-base leading-8 text-muted">
          {ar
            ? 'Oddio منصة لاكتشاف وسماع الموسيقى المصنوعة بالذكاء الاصطناعي. لو بتصنع موسيقى أصلية باستخدام أدوات AI، اتعرّف على مسار التقديم والمراجعة وإدارة الإصدارات.'
            : 'Oddio is a platform for listening to and discovering AI-generated music. If you create original songs with AI tools, explore how to apply as an artist, follow publishing requirements and manage releases.'}
        </p>
      </header>
      <section
        className="grid gap-4 sm:grid-cols-3"
        aria-label={ar ? 'خطوات الانضمام' : 'Artist application steps'}
      >
        {stages.map(([title, detail], index) => (
          <article
            key={title}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
          >
            <span className="text-xs font-black text-primary">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2 className="mt-2 text-lg font-bold text-ink">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{detail}</p>
          </article>
        ))}
      </section>
      <div className="flex flex-wrap gap-4">
        <Link
          href={`/${locale}/apply/artist`}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-background transition hover:brightness-110"
        >
          {ar ? 'ابدأ طلب الانضمام' : 'Start an artist application'}
        </Link>
        <Link
          href={`/${locale}/legal/content-policy`}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-6 text-sm font-bold text-ink hover:border-primary/60"
        >
          {ar ? 'اقرأ سياسة المحتوى' : 'Read our content policy'}
        </Link>
      </div>
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-ink">
          {ar ? 'هل Oddio مناسب لموسيقاك؟' : 'Is Oddio right for your music?'}
        </h2>
        <p className="text-sm leading-8 text-muted">
          {ar
            ? 'لو بتصنع أغاني أصلية باستخدام أدوات الذكاء الاصطناعي، Oddio بيوفر مساحة لعرض أعمالك واكتشاف مستمعين. القبول والنشر مش تلقائيين، وكل محتوى لازم يلتزم بالقواعد المعلنة.'
            : 'If you create original songs using AI music tools, Oddio offers a place for listeners to find your work. Artist approval and publishing are not automatic; all content must follow the published platform rules.'}
        </p>
      </section>
    </div>
  );
}
