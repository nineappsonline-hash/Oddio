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
  { value: 'copyright', label: 'Copyright / rights' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'explicit_content', label: 'Prohibited explicit content' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
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
      toast('Report submitted. Our moderators will review it.', 'success');
    } catch {
      toast('Could not submit the report.', 'error');
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
        title="Report content"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} loading={pending}>
              Submit report
            </Button>
          </>
        }
      >
        <Field label="Reason" htmlFor="report-reason">
          <select
            id="report-reason"
            className="input"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          >
            {REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Details"
          hint="Optional, but helpful for moderators."
          htmlFor="report-details"
        >
          <textarea
            id="report-details"
            className="input min-h-24"
            value={details}
            maxLength={2000}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Describe the issue…"
          />
        </Field>
      </Modal>
    </>
  );
}
