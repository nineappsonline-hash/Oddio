'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { loginHref, useLocalePath } from '@/lib/use-locale-path';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';

const REASONS = [
  { value: 'copyright', en: 'Copyright / rights', ar: 'حقوق النشر والتوزيع' },
  { value: 'impersonation', en: 'Voice / identity impersonation', ar: 'انتحال صوت أو هوية' },
  { value: 'explicit_content', en: 'Prohibited explicit content', ar: 'محتوى غير مسموح' },
  { value: 'harassment', en: 'Harassment', ar: 'مضايقة' },
  { value: 'spam', en: 'Spam', ar: 'محتوى مزعج أو مكرر' },
  { value: 'other', en: 'Other', ar: 'سبب آخر' },
] as const;

export function ReportButton({
  targetType,
  targetId,
  label = 'Report',
}: {
  targetType: 'track' | 'artist' | 'comment';
  targetId: string;
  label?: string;
}) {
  const { user } = useSession();
  const { locale, pathname } = useLocalePath();
  const ar = locale === 'ar';
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>('copyright');
  const [details, setDetails] = useState('');
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!user) {
      setOpen(false);
      router.push(loginHref(locale, pathname));
      return;
    }
    setPending(true);
    try {
      await apiRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, reason, details }),
      });
      setOpen(false);
      setDetails('');
      toast(ar ? 'تم إرسال البلاغ للمراجعة.' : 'Report submitted for moderator review.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : (ar ? 'تعذر إرسال البلاغ.' : 'Could not submit the report.'), 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4" />
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={ar ? 'الإبلاغ عن محتوى' : 'Report content'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {ar ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={submit} loading={pending}>
              {ar ? 'إرسال البلاغ' : 'Submit report'}
            </Button>
          </>
        }
      >
        <Field label={ar ? 'سبب البلاغ' : 'Reason'} htmlFor="report-reason">
          <select
            id="report-reason"
            className="input"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          >
            {REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {ar ? item.ar : item.en}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={ar ? 'التفاصيل' : 'Details'}
          hint={ar ? 'اختياري، لكن يساعد فريق المراجعة.' : 'Optional, but helpful for moderators.'}
          htmlFor="report-details"
        >
          <textarea
            id="report-details"
            className="input min-h-24"
            value={details}
            maxLength={2000}
            onChange={(event) => setDetails(event.target.value)}
            placeholder={ar ? 'وضح المشكلة باختصار…' : 'Describe the issue…'}
          />
        </Field>
      </Modal>
    </>
  );
}
