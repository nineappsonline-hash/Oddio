import Link from 'next/link';

export default async function LocaleNotFound({
  params,
}: {
  params?: Promise<{ locale: string }>;
}) {
  const resolved = params ? await params : undefined;
  const locale = resolved?.locale === 'ar' ? 'ar' : 'en';
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">404</p>
      <h1 className="mt-3 text-2xl font-bold text-ink">
        {locale === 'ar' ? 'ماعرفناش نلاقي الصفحة دي' : 'We could not find that page'}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        {locale === 'ar'
          ? 'يمكن اللينك مكسور، أو المحتوى خاص أو مش منشور.'
          : 'The link may be broken, or the content may be private or unpublished.'}
      </p>
      <Link
        href={`/${locale}`}
        className="mt-5 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-strong"
      >
        {locale === 'ar' ? 'ارجع للرئيسية' : 'Back to home'}
      </Link>
    </div>
  );
}
