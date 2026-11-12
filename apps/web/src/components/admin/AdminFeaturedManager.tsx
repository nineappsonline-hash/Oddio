'use client';

import { useT } from '@/i18n/use-translator';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const { toast } = useToast();
  const [slot, setSlot] = useState<'hero' | 'editorial' | 'playlist'>('hero');
  const [entityType, setEntityType] = useState<'track' | 'playlist'>('track');
  const [entityId, setEntityId] = useState(tracks[0]?.id ?? '');
  const [pending, setPending] = useState(false);

  const options = entityType === 'track' ? tracks : playlists;

  async function update(targetSlot: Slot, action: 'add' | 'remove', targetId: string) {
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
        <ul className="space-y-2">
          {slots.length === 0 ? (
            <li className="text-sm text-muted">{t('common.none')}</li>
          ) : (
            slots.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2"
              >
                <span className="min-w-0 text-xs">
                  <Badge tone="primary">{item.slot}</Badge>
                  <span className="ms-2 truncate text-ink">
                    {labels[item.entityId] ?? item.entityId}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => update(item, 'remove', item.entityId)}
                  loading={pending}
                >
                  {t('admin.removeFeatured')}
                </Button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
