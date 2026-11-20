import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { seoAbsoluteUrl } from '@/lib/seo-origin';

export type SeoBreadcrumb = { label: string; href: string };

/**
 * The visual breadcrumb matches the structured data exactly.
 * All hrefs must be public canonical routes; do not include query strings.
 */
export function SeoBreadcrumbs({ items }: { items: SeoBreadcrumb[] }) {
  if (items.length < 2) return null;

  const safeItems = items.filter((item) => item.label && item.href.startsWith('/'));
  if (safeItems.length < 2) return null;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: safeItems.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            item: seoAbsoluteUrl(item.href),
          })),
        }}
      />
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex flex-wrap items-center gap-2 text-xs leading-6 text-muted"
      >
        {safeItems.map((item, index) => (
          <span key={item.href} className="inline-flex max-w-full items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {index === safeItems.length - 1 ? (
              <span
                aria-current="page"
                className="max-w-[65vw] truncate font-semibold text-ink"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="font-medium text-muted transition hover:text-primary focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {item.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
