'use client';

import { useT } from '@/i18n/use-translator';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';

type Decision = 'approve' | 'reject' | 'request_changes';

export function AdminTrackDecision({
  trackId,
  audioReady = false,
}: {
  trackId: string;
  audioReady?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<Decision | null>(null);

  async function decide(decision: Decision) {
    if (decision !== 'approve' && reason.trim().length < 10) {
      toast('Please provide a clear explanation (at least 10 characters).', 'error');
      return;
    }
    setPending(decision);
    try {
      await apiRequest(`/api/admin/tracks/${trackId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason }),
      });
      toast(t('admin.decisionRecorded'), 'success');
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Could not record the decision.',
        'error',
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={2000}
        placeholder={t('admin.reason')}
        className="input min-h-16 text-xs"
        aria-label={t('admin.reason')}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => decide('approve')}
          loading={pending === 'approve'}
          disabled={pending !== null || !audioReady}
          title={!audioReady ? 'Audio processing must finish before approval' : undefined}
        >
          <CheckCircle2 className="h-4 w-4" />
          {t('admin.approve')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => decide('request_changes')}
          loading={pending === 'request_changes'}
          disabled={pending !== null}
        >
          <AlertCircle className="h-4 w-4" />
          {t('admin.requestChanges')}
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => decide('reject')}
          loading={pending === 'reject'}
          disabled={pending !== null}
        >
          <XCircle className="h-4 w-4" />
          {t('admin.reject')}
        </Button>
      </div>
    </div>
  );
}

export function AdminApplicationDecision({ applicationId }: { applicationId: string }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  async function decide(decision: 'approve' | 'reject' | 'request_information') {
    setPending(decision);
    try {
      await apiRequest(`/api/admin/artist-applications/${applicationId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes }),
      });
      toast(
        decision === 'approve'
          ? t('admin.applicationApproved')
          : t('admin.decisionRecorded'),
        'success',
      );
      router.refresh();
    } catch {
      toast('Could not record the decision.', 'error');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={2000}
        placeholder={t('admin.reason')}
        className="input min-h-16 text-xs"
        aria-label={t('admin.reason')}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => decide('approve')}
          loading={pending === 'approve'}
          disabled={pending !== null}
        >
          {t('admin.approve')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => decide('request_information')}
          loading={pending === 'request_information'}
          disabled={pending !== null}
        >
          {t('admin.requestInfo')}
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => decide('reject')}
          loading={pending === 'reject'}
          disabled={pending !== null}
        >
          {t('admin.reject')}
        </Button>
      </div>
    </div>
  );
}

export function AdminReportActions({ reportId }: { reportId: string }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<'resolve' | 'dismiss' | null>(null);

  async function act(resolution: 'resolve' | 'dismiss') {
    if (notes.trim().length < 10) {
      toast(
        'Explain the decision (at least 10 characters) before closing a report.',
        'error',
      );
      return;
    }
    setPending(resolution);
    try {
      await apiRequest(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution, notes }),
      });
      toast(t('admin.reportResolved'), 'success');
      router.refresh();
    } catch {
      toast('Could not update the report.', 'error');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={2000}
        placeholder={t('admin.reason')}
        className="input h-9 text-xs"
        aria-label={t('admin.reason')}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => act('resolve')}
          loading={pending === 'resolve'}
          disabled={pending !== null}
        >
          {t('admin.resolve')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => act('dismiss')}
          loading={pending === 'dismiss'}
          disabled={pending !== null}
        >
          {t('admin.dismiss')}
        </Button>
      </div>
    </div>
  );
}

export function AdminVerificationActions({ requestId }: { requestId: string }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);

  async function decide(decision: 'approve' | 'reject') {
    setPending(decision);
    try {
      await apiRequest(`/api/admin/verification/${requestId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes }),
      });
      toast(
        decision === 'approve'
          ? t('admin.verificationApproved')
          : t('admin.verificationRejected'),
        'success',
      );
      router.refresh();
    } catch {
      toast('Could not record the decision.', 'error');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={2000}
        placeholder={t('admin.reason')}
        className="input h-9 min-w-40 flex-1 text-xs"
        aria-label={t('admin.reason')}
      />
      <Button size="sm" onClick={() => decide('approve')} loading={pending === 'approve'}>
        {t('admin.approve')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => decide('reject')}
        loading={pending === 'reject'}
      >
        {t('admin.reject')}
      </Button>
    </div>
  );
}

export function AdminCommentToggle({
  commentId,
  status,
}: {
  commentId: string;
  status: 'visible' | 'hidden' | 'pending';
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const next = status === 'hidden' ? 'visible' : 'hidden';

  async function onClick() {
    setPending(true);
    try {
      await apiRequest(`/api/admin/comments/${commentId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: next }),
      });
      toast(
        next === 'hidden' ? t('admin.commentHidden') : t('admin.commentRestored'),
        'success',
      );
      router.refresh();
    } catch {
      toast('Could not update the comment.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={onClick} loading={pending}>
      {next === 'hidden' ? t('admin.hideComment') : t('admin.unhideComment')}
    </Button>
  );
}

export function AdminQuotaForm({
  userId,
  currentLimit,
}: {
  userId: string;
  currentLimit: number;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [limit, setLimit] = useState(currentLimit);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      await apiRequest(`/api/admin/users/${userId}/quota`, {
        method: 'POST',
        body: JSON.stringify({ dailyLimit: Number(limit) }),
      });
      toast(t('admin.quotaSaved'), 'success');
      router.refresh();
    } catch {
      toast('Could not update the quota.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={1}
        max={100}
        value={limit}
        onChange={(event) => setLimit(Number(event.target.value))}
        className="input h-8 w-16 text-xs"
        aria-label={t('admin.setQuota')}
      />
      <Button size="sm" variant="outline" onClick={save} loading={pending}>
        {t('common.save')}
      </Button>
    </div>
  );
}

export function AdminRoleForm({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [role, setRole] = useState(currentRole ?? '');
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role: role || null }),
      });
      toast(t('admin.decisionRecorded'), 'success');
      router.refresh();
    } catch {
      toast('Only a super admin can change roles.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={role}
        onChange={(event) => setRole(event.target.value)}
        className="input h-8 w-28 text-xs"
        aria-label={t('admin.role')}
      >
        <option value="">{t('admin.role.listener')}</option>
        <option value="moderator">{t('admin.role.moderator')}</option>
        <option value="admin">{t('admin.role.admin')}</option>
        <option value="super_admin">{t('admin.role.super_admin')}</option>
      </select>
      <Button size="sm" variant="outline" onClick={save} loading={pending}>
        {t('common.save')}
      </Button>
    </div>
  );
}
