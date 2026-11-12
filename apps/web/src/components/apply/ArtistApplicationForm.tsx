'use client';

import { useT } from '@/i18n/use-translator';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
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
      toast(t('apply.submitted'), 'success');
      router.refresh();
    } catch {
      toast('Could not submit the application.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-5">
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
      <input type="hidden" value={locale} readOnly />
    </form>
  );
}
