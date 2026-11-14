'use client';

import { useT } from '@/i18n/use-translator';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';

type Option = { id: string; label: string };
type Slot = {
  id: string;
  slot: string;
  entityType: 'track' | 'artist' | 'playlist';
  entityId: string;
  rank: number;
  startAt?: string | null;
  endAt?: string | null;
};

export function AdminFeaturedManager({
  slots,
  tracks,
  playlists,
  labels,
}: {
  slots: Slot[];
  tracks: Option[];
  playlists: Option[];
  labels: Record<string, string>;
}) {
  const t = useT();
  const router = useRouter();
  const params = useParams();
  const ar = params.locale === 'ar';
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'scheduled' | 'active' | 'expired'
  >('all');
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, []);
  const statusFor = (item: Slot): 'scheduled' | 'active' | 'expired' => {
    if (now === null) return 'active';
    if (item.endAt && Date.parse(item.endAt) <= now) return 'expired';
    if (item.startAt && Date.parse(item.startAt) > now) return 'scheduled';
    return 'active';
  };
  const statusLabel = (status: 'scheduled' | 'active' | 'expired') =>
    ar
      ? { scheduled: 'مجدول', active: 'نشط', expired: 'منتهي' }[status]
      : { scheduled: 'Scheduled', active: 'Active', expired: 'Expired' }[status];
  const { toast } = useToast();
  const [slot, setSlot] = useState<'hero' | 'editorial' | 'playlist'>('hero');
  const [entityType, setEntityType] = useState<'track' | 'playlist'>('track');
  const [entityId, setEntityId] = useState(tracks[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  const [schedules, setSchedules] = useState<
    Record<string, { start: string; end: string }>
  >({});
  const scheduleKey = (item: Slot) => item.id;
  const toInputDate = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  async function saveSchedule(item: Slot) {
    const values = schedules[scheduleKey(item)] ?? {
      start: toInputDate(item.startAt),
      end: toInputDate(item.endAt),
    };
    const startMs = values.start ? new Date(values.start).getTime() : null;
    const endMs = values.end ? new Date(values.end).getTime() : null;
    if (
      (startMs !== null && !Number.isFinite(startMs)) ||
      (endMs !== null && !Number.isFinite(endMs)) ||
      (startMs !== null && endMs !== null && startMs >= endMs)
    ) {
      toast(
        ar
          ? 'تأكد من صحة المواعيد وأن النهاية بعد البداية.'
          : 'Check the dates: end must be after start.',
        'error',
      );
      return;
    }
    setPending(true);
    try {
      await apiRequest('/api/admin/featured', {
        method: 'POST',
        body: JSON.stringify({
          slot: item.slot,
          entityType: item.entityType,
          entityId: item.entityId,
          action: 'schedule',
          startAt: startMs === null ? null : new Date(startMs).toISOString(),
          endAt: endMs === null ? null : new Date(endMs).toISOString(),
        }),
      });
      toast(t('admin.featuredUpdated'), 'success');
      router.refresh();
    } catch {
      toast('Could not save campaign dates. Check the start and end times.', 'error');
    } finally {
      setPending(false);
    }
  }

  const options = entityType === 'track' ? tracks : playlists;
  const orderedSlots = [...slots]
    .filter((item) => statusFilter === 'all' || statusFor(item) === statusFilter)
    .sort((a, b) => a.slot.localeCompare(b.slot) || a.rank - b.rank);
  const allOrderedSlots = [...slots].sort(
    (a, b) => a.slot.localeCompare(b.slot) || a.rank - b.rank,
  );

  async function update(
    targetSlot: Slot,
    action: 'add' | 'remove' | 'move_up' | 'move_down',
    targetId: string,
  ) {
    setPending(true);
    try {
      await apiRequest('/api/admin/featured', {
        method: 'POST',
        body: JSON.stringify({
          slot: targetSlot.slot,
          entityType: targetSlot.entityType,
          entityId: targetId,
          action,
        }),
      });
      toast(t('admin.featuredUpdated'), 'success');
      router.refresh();
    } catch {
      toast('Could not update featured content.', 'error');
    } finally {
      setPending(false);
    }
  }

  async function add() {
    setPending(true);
    try {
      await apiRequest('/api/admin/featured', {
        method: 'POST',
        body: JSON.stringify({ slot, entityType, entityId, action: 'add' }),
      });
      toast(t('admin.featuredUpdated'), 'success');
      router.refresh();
    } catch {
      toast('Could not update featured content.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          {t('admin.addFeatured')}
        </h2>
        <div className="space-y-3">
          <Field label={t('admin.featuredSlot')} htmlFor="featured-slot">
            <select
              id="featured-slot"
              className="input"
              value={slot}
              onChange={(event) => setSlot(event.target.value as typeof slot)}
            >
              <option value="hero">hero</option>
              <option value="editorial">editorial</option>
              <option value="playlist">playlist</option>
            </select>
          </Field>
          <Field label={t('admin.target')} htmlFor="featured-type">
            <select
              id="featured-type"
              className="input"
              value={entityType}
              onChange={(event) => {
                const next = event.target.value as 'track' | 'playlist';
                setEntityType(next);
                setEntityId((next === 'track' ? tracks[0]?.id : playlists[0]?.id) ?? '');
              }}
            >
              <option value="track">{t('common.track')}</option>
              <option value="playlist">{t('common.playlists')}</option>
            </select>
          </Field>
          <Field label={t('admin.entity')} htmlFor="featured-entity">
            <select
              id="featured-entity"
              className="input"
              value={entityId}
              onChange={(event) => setEntityId(event.target.value)}
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Button onClick={add} loading={pending} disabled={!entityId}>
            {t('admin.addFeatured')}
          </Button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          {t('admin.featured')}
        </h2>
        <div
          className="mb-4 flex flex-wrap gap-2"
          aria-label={ar ? 'تصفية حالة الحملات' : 'Filter campaign status'}
        >
          {(['all', 'scheduled', 'active', 'expired'] as const).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${statusFilter === status ? 'border-primary bg-primary/15 text-ink' : 'border-white/10 text-muted'}`}
            >
              {status === 'all' ? (ar ? 'الكل' : 'All') : statusLabel(status)} (
              {status === 'all'
                ? slots.length
                : slots.filter((item) => statusFor(item) === status).length}
              )
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {orderedSlots.length === 0 ? (
            <li className="text-sm text-muted">{t('common.none')}</li>
          ) : (
            orderedSlots.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
              >
                <span className="min-w-0 text-xs">
                  <Badge tone="primary">{item.slot}</Badge>
                  <span className="ms-2 rounded-md border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-muted">
                    {statusLabel(statusFor(item))}
                  </span>
                  <span className="ms-2 truncate text-ink">
                    {labels[item.entityId] ?? item.entityId}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update(item, 'move_up', item.entityId)}
                    loading={pending}
                    disabled={
                      allOrderedSlots.filter((entry) => entry.slot === item.slot)[0]
                        ?.id === item.id
                    }
                    aria-label={ar ? 'نقل العنصر لأعلى' : 'Move featured item up'}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update(item, 'move_down', item.entityId)}
                    loading={pending}
                    disabled={
                      orderedSlots.filter((entry) => entry.slot === item.slot).at(-1)
                        ?.id === item.id
                    }
                    aria-label={ar ? 'نقل العنصر لأسفل' : 'Move featured item down'}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update(item, 'remove', item.entityId)}
                    loading={pending}
                  >
                    {t('admin.removeFeatured')}
                  </Button>
                </div>
                <div className="flex w-full flex-wrap items-end gap-2 border-t border-white/10 pt-2">
                  <label className="text-xs text-muted">
                    {ar ? 'البداية (التوقيت المحلي)' : 'Start (local)'}
                    <input
                      type="datetime-local"
                      className="input mt-1 block"
                      value={schedules[item.id]?.start ?? toInputDate(item.startAt)}
                      onChange={(event) =>
                        setSchedules((prev) => ({
                          ...prev,
                          [item.id]: {
                            start: event.target.value,
                            end: prev[item.id]?.end ?? toInputDate(item.endAt),
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-muted">
                    {ar ? 'النهاية (التوقيت المحلي)' : 'End (local)'}
                    <input
                      type="datetime-local"
                      className="input mt-1 block"
                      value={schedules[item.id]?.end ?? toInputDate(item.endAt)}
                      onChange={(event) =>
                        setSchedules((prev) => ({
                          ...prev,
                          [item.id]: {
                            start: prev[item.id]?.start ?? toInputDate(item.startAt),
                            end: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => saveSchedule(item)}
                    loading={pending}
                  >
                    {ar ? 'حفظ الجدولة' : 'Save schedule'}
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
