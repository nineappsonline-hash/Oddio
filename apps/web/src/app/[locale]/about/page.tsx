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
    title: locale === 'ar' ? 'عن Oddio' : 'About Oddio',
    description:
      locale === 'ar'
        ? 'تعرّف على Oddio، منصة لاستكشاف وسماع الموسيقى بالذكاء الاصطناعي.'
        : 'Learn about Oddio, a music discovery and listening platform for AI-generated songs.',
    path: '/about',
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === 'ar';

  const questions = ar
    ? [
        {
          q: 'إيه هو Oddio؟',
          a: 'Oddio منصة للاستماع واكتشاف الأغاني والموسيقى المصنوعة بالذكاء الاصطناعي. تقدر تتصفح الأغاني والفنانين والأنواع الموسيقية وقوائم التشغيل من مكان واحد.',
        },
        {
          q: 'ألاقي موسيقى جديدة إزاي؟',
          a: 'ابدأ من صفحة اكتشف، أو تصفح الأنواع الموسيقية، أو شوف الأغاني الأكثر استماعًا. وفي Soundspace تقدر تختار المود ودرجة الاكتشاف علشان تبدأ ميكس مناسب.',
        },
        {
          q: 'هل في أغاني عربية على Oddio؟',
          a: 'أيوه. Oddio بيدعم الأغاني بالعربي والإنجليزي، وبيجمع أنواع موسيقية عربية وعالمية. تقدر تتصفح قسم الأنواع علشان توصل للموسيقى اللي بتحبها.',
        },
        {
          q: 'هل أقدر أنشر موسيقاي؟',
          a: 'Oddio بيوفر مسار لتقديم طلب الانضمام كفنان، وبعد الموافقة يقدر الفنان يدير أغانيه وإصداراته من الاستوديو. المحتوى بيخضع لمتطلبات النشر والمراجعة.',
        },
      ]
    : [
        {
          q: 'What is Oddio?',
          a: 'Oddio is a listening and discovery platform focused on AI-generated music. Explore original songs, music artists, genres and playlists in one place.',
        },
        {
          q: 'How can I discover new AI music?',
          a: 'Start with Discover to explore new releases, browse Genres for a specific sound, or check Charts for popular tracks. Soundspace lets you choose a mood and discovery level for a tailored mix.',
        },
        {
          q: 'Does Oddio have Arabic music?',
          a: 'Yes. Oddio supports Arabic and English browsing, with both Arabic and international music genres available to explore.',
        },
        {
          q: 'Can artists publish music on Oddio?',
          a: 'Artists can apply to join Oddio. Approved artist managers can organize songs and releases through the Artist Studio, subject to the platform’s publishing and review requirements.',
        },
      ];

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-16">
      <header className="space-y-4">
        <p className="oddio-micro-label">
          {ar ? 'تعرّف على المنصة' : 'ABOUT THE PLATFORM'}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-ink sm:text-5xl">
          {ar
            ? 'Oddio: عالم الموسيقى بالذكاء الاصطناعي'
            : 'Oddio: A Home for AI-Generated Music'}
        </h1>
        <p className="max-w-3xl text-base leading-8 text-muted">
          {ar
            ? 'Oddio مساحة لاكتشاف موسيقى أصلية اتعملت باستخدام الذكاء الاصطناعي، والاستماع لأغاني جديدة، والتعرّف على فنانين مستقلين. تركيزنا على اكتشاف الصوت المناسب، مش مجرد البحث عن اسم أغنية.'
            : 'Oddio is a place to discover and listen to original music created with AI. Explore new songs, follow independent music artists and find the sound that fits your mood.'}
        </p>
      </header>

      <section
        className="grid gap-4 sm:grid-cols-3"
        aria-label={ar ? 'استكشف Oddio' : 'Explore Oddio'}
      >
        {[
          {
            href: 'discover',
            title: ar ? 'اكتشف موسيقى جديدة' : 'Discover new songs',
            detail: ar ? 'إصدارات وأغاني وفنانين.' : 'Fresh music and emerging artists.',
          },
          {
            href: 'genres',
            title: ar ? 'تصفح الأنواع' : 'Browse music genres',
            detail: ar
              ? 'عربي وبوب وراب وإلكترونيك وأكثر.'
              : 'Arabic, pop, hip-hop, electronic and more.',
          },
          {
            href: 'soundspace',
            title: ar ? 'جرّب Soundspace' : 'Try Soundspace',
            detail: ar ? 'ميكس حسب المود.' : 'Discover a mood-based mix.',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={`/${locale}/${item.href}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-primary/60 hover:bg-white/10"
          >
            <h2 className="text-lg font-bold text-ink">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
          </Link>
        ))}
      </section>

      <section aria-labelledby="oddio-faq-heading" className="space-y-5">
        <h2 id="oddio-faq-heading" className="text-2xl font-bold text-ink">
          {ar ? 'أسئلة شائعة عن Oddio' : 'Questions About Oddio'}
        </h2>
        <div className="space-y-4">
          {questions.map((item) => (
            <article
              key={item.q}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
            >
              <h3 className="text-lg font-bold text-ink">{item.q}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
      <p className="text-sm text-muted">
        {ar ? 'عاوز تنشر موسيقاك؟ ' : 'Want to publish your music? '}
        <Link
          href={`/${locale}/for-artists`}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {ar ? 'قدّم كفنان على Oddio' : 'Apply to become an Oddio artist'}
        </Link>
      </p>
    </div>
  );
}
