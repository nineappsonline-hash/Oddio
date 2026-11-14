'use client';

import { useT } from '@/i18n/use-translator';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { ApiClientError, apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

export function ArtistApplicationForm({
  locale,
  defaults,
  resubmit = false,
}: {
  locale: Locale;
  defaults?: {
    displayName: string;
    description: string;
    portfolioUrl: string;
    contactEmail: string;
  };
  resubmit?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(defaults?.displayName ?? '');
  const [description, setDescription] = useState(defaults?.description ?? '');
  const [portfolioUrl, setPortfolioUrl] = useState(defaults?.portfolioUrl ?? '');
  const [contactEmail, setContactEmail] = useState(defaults?.contactEmail ?? '');
  const [rights, setRights] = useState(false);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState(1);
  useEffect(() => {
    if (defaults || resubmit) return;
    try {
      const saved = JSON.parse(localStorage.getItem('oddio-artist-draft') || 'null');
      if (saved) { setDisplayName(saved.displayName || ''); setDescription(saved.description || ''); setPortfolioUrl(saved.portfolioUrl || ''); setContactEmail(saved.contactEmail || ''); }
    } catch { /* ignore invalid draft */ }
  }, [defaults, resubmit]);
  useEffect(() => {
    if (!resubmit) localStorage.setItem('oddio-artist-draft', JSON.stringify({ displayName, description, portfolioUrl, contactEmail }));
  }, [displayName, description, portfolioUrl, contactEmail, resubmit]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await apiRequest('/api/artist-applications', {
        method: 'POST',
        body: JSON.stringify({
          displayName,
          description,
          portfolioUrl,
          contactEmail,
          rightsDeclared: rights,
        }),
      });
      localStorage.removeItem('oddio-artist-draft');
      toast(t('apply.submitted'), 'success');
      router.refresh();
    } catch (caught) {
      toast(
        caught instanceof ApiClientError
          ? caught.message
          : 'Could not submit the application.',
        'error',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
    <form onSubmit={step === 1 ? (event) => { event.preventDefault(); if (event.currentTarget.reportValidity()) setStep(2); } : onSubmit} className="card space-y-5 border border-violet-400/20 bg-[#17151f] p-5 sm:p-8">
      <p className="text-xs font-bold tracking-widest text-violet-300">ODDIO / CREATOR STUDIO</p>
      <h2 className="text-2xl font-black text-white">{step === 1 ? (locale === 'ar' ? 'اصنع هويتك الفنية' : 'Create your artist identity') : (locale === 'ar' ? 'راجع طلبك' : 'Review your application')}</h2>
      <div className="flex gap-2"><span className="h-1.5 flex-1 rounded-full bg-violet-500" /><span className={step === 2 ? "h-1.5 flex-1 rounded-full bg-violet-500" : "h-1.5 flex-1 rounded-full bg-white/10"} /></div>
      <p className="text-xs text-muted">{locale === 'ar' ? 'خطوة' : 'Step'} {step}/2</p>
      <fieldset disabled={step !== 1} className={step === 1 ? 'space-y-4' : 'hidden'}>
      <Field label={t('apply.displayName')} htmlFor="apply-name">
        <input
          id="apply-name"
          required
          minLength={2}
          maxLength={80}
          className="input"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </Field>
      <Field
        label={t('apply.description')}
        hint="At least 40 characters about your music, influences and process."
        htmlFor="apply-description"
      >
        <textarea
          id="apply-description"
          required
          minLength={40}
          maxLength={2000}
          className="input min-h-32"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label={t('apply.portfolioUrl')} htmlFor="apply-portfolio">
        <input
          id="apply-portfolio"
          type="url"
          className="input"
          placeholder="https://"
          value={portfolioUrl}
          onChange={(event) => setPortfolioUrl(event.target.value)}
        />
      </Field>
      <Field label={t('apply.contactEmail')} htmlFor="apply-email">
        <input
          id="apply-email"
          type="email"
          required
          className="input"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
        />
      </Field>
      </fieldset>
      {step === 1 ? <Button type="submit" size="lg" className="w-full">{locale === 'ar' ? 'متابعة للمراجعة' : 'Continue to review →'}</Button> : <>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"><p className="font-bold text-white">{displayName}</p><p className="whitespace-pre-wrap text-muted">{description}</p><p className="break-all text-muted">{contactEmail}</p>{portfolioUrl && <p className="break-all text-violet-300">{portfolioUrl}</p>}</div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-ink/85">
        <input
          type="checkbox"
          required
          checked={rights}
          onChange={(event) => setRights(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-surface accent-primary"
        />
        {t('apply.rightsText')}
      </label>
      <Button type="submit" loading={pending}>
        {resubmit ? t('apply.resubmit') : t('apply.submit')}
      </Button>
      <button type="button" onClick={() => setStep(1)} className="block text-sm text-violet-300">{locale === 'ar' ? 'تعديل البيانات' : 'Edit details'}</button></>}
      <p className="text-xs text-muted">{locale === 'ar' ? 'يتم حفظ المسودة على هذا الجهاز' : 'Draft saved on this device'}</p>
    </form>
    <aside className="h-fit space-y-4 rounded-3xl border border-violet-400/20 bg-gradient-to-br from-[#302043] to-[#102c38] p-6 lg:sticky lg:top-24"><p className="text-xs font-bold tracking-widest text-violet-200">ARTIST PREVIEW</p><div className="grid h-48 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-700 to-cyan-700 text-6xl font-black text-white">{(displayName.trim()[0] || '♪').toUpperCase()}</div><h3 className="truncate text-xl font-black text-white">{displayName || 'Your artist name'}</h3><p className="line-clamp-4 whitespace-pre-wrap text-sm text-white/70">{description || 'Your music story appears here.'}</p></aside></div>
  );
}
