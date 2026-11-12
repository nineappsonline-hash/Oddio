'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { Locale, Playlist } from '@ai-music/contracts';
import { apiRequest } from '@/lib/client-api';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { slugify } from '@/lib/links';

export function PlaylistForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: {
    title: string;
    description: string;
    visibility: string;
    create: string;
    public: string;
    private: string;
    created: string;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await apiRequest<{ playlist: Playlist }>('/api/playlists', {
        method: 'POST',
        body: JSON.stringify({ title, description, visibility }),
      });
      toast(labels.created, 'success');
      router.push(
        `/${locale}/playlists/${result.playlist.id}-${slugify(result.playlist.title)}`,
      );
      router.refresh();
    } catch {
      toast('Could not create the playlist.', 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-xl space-y-4 p-5">
      <Field label={labels.title} htmlFor="playlist-title">
        <input
          id="playlist-title"
          required
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="input"
        />
      </Field>
      <Field label={labels.description} htmlFor="playlist-description">
        <textarea
          id="playlist-description"
          value={description}
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
          className="input min-h-24"
        />
      </Field>
      <Field label={labels.visibility} htmlFor="playlist-visibility">
        <select
          id="playlist-visibility"
          value={visibility}
          onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
          className="input"
        >
          <option value="public">{labels.public}</option>
          <option value="private">{labels.private}</option>
        </select>
      </Field>
      <Button type="submit" loading={pending}>
        <Plus className="h-4 w-4" />
        {labels.create}
      </Button>
    </form>
  );
}
