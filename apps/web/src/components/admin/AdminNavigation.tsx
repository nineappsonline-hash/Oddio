'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale, StaffRole } from '@ai-music/contracts';

type Item = { href: string; en: string; ar: string; roles?: StaffRole[] };
type Group = { en: string; ar: string; items: Item[] };

const groups: Group[] = [
  { en: 'COMMAND CENTER', ar: 'مركز التحكم', items: [
    { href: '', en: 'Overview', ar: 'نظرة عامة' },
  ] },
  { en: 'MUSIC & CONTENT', ar: 'الموسيقى والمحتوى', items: [
    { href: '/review', en: 'Track review', ar: 'مراجعة الأغاني' },
    { href: '/applications', en: 'Artist applications', ar: 'طلبات الفنانين' },
    { href: '/track-changes', en: 'Lyrics & artwork changes', ar: 'تعديلات الكلمات والأغلفة' },
    { href: '/featured', en: 'Featured content', ar: 'المحتوى المميز', roles: ['admin', 'super_admin'] },
  ] },
  { en: 'TRUST & SAFETY', ar: 'الثقة والسلامة', items: [
    { href: '/reports', en: 'Reports', ar: 'البلاغات' },
    { href: '/comments', en: 'Comments', ar: 'التعليقات' },
    { href: '/verification', en: 'Verification', ar: 'التوثيق', roles: ['admin', 'super_admin'] },
  ] },
  { en: 'PEOPLE & ACCESS', ar: 'المستخدمون والصلاحيات', items: [
    { href: '/users', en: 'Users & quotas', ar: 'المستخدمون وحصص الرفع', roles: ['admin', 'super_admin'] },
  ] },
  { en: 'ANALYTICS', ar: 'التحليلات', items: [
    { href: '/analytics', en: 'Platform analytics', ar: 'تحليلات المنصة', roles: ['admin', 'super_admin'] },
  ] },
  { en: 'SYSTEM & SECURITY', ar: 'النظام والأمان', items: [
    { href: '/audit', en: 'Audit log', ar: 'سجل العمليات', roles: ['admin', 'super_admin'] },
  ] },
];

export function AdminNavigation({ locale, roles }: { locale: Locale; roles: StaffRole[] }) {
  const pathname = usePathname();
  const base = `/${locale}/admin`;
  return (
    <nav aria-label={locale === 'ar' ? 'التنقل في لوحة الإدارة' : 'Admin navigation'} className="space-y-6">
      {groups.map((group) => {
        const visible = group.items.filter((item) => !item.roles || item.roles.some((role) => roles.includes(role)));
        if (!visible.length) return null;
        return (
          <section key={group.en}>
            <h2 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-muted/75">{locale === 'ar' ? group.ar : group.en}</h2>
            <div className="space-y-1">
              {visible.map((item) => {
                const href = base + item.href;
                const active = pathname === href || (item.href !== '' && pathname.startsWith(href + '/'));
                return (
                  <Link key={item.href} href={href} aria-current={active ? 'page' : undefined}
                    className={`block rounded-xl border px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active ? 'border-primary/35 bg-primary/15 text-ink shadow-sm' : 'border-transparent text-muted hover:border-white/10 hover:bg-white/5 hover:text-ink'}`}>
                    {locale === 'ar' ? item.ar : item.en}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
}
