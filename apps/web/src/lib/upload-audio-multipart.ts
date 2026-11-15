'use client';

import { apiRequest } from '@/lib/client-api';
import { uploadAudioWithProgress } from '@/lib/upload-audio-progress';

const DRAFT_KEY = 'oddio-multipart-v1';
export const MULTIPART_THRESHOLD = 8 * 1024 * 1024;
const MAX_SESSION_AGE_MS = 6 * 24 * 60 * 60 * 1000;

type MultipartDraft = {
  filename: string;
  size: number;
  lastModified: number;
  objectKey: string;
  uploadId: string;
  partSize: number;
  createdAt: number;
};

type MultipartAction = {
  action: 'start' | 'list' | 'part' | 'complete';
  filename?: string;
  contentType?: 'audio/mpeg';
  objectKey?: string;
  uploadId?: string;
  bytes: number;
  partNumber?: number;
};

function sessionFor(file: File): MultipartDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as MultipartDraft;
    if (value.filename !== file.name || value.size !== file.size ||
      value.lastModified !== file.lastModified ||
      value.createdAt > Date.now() || Date.now() - value.createdAt > MAX_SESSION_AGE_MS ||
      value.partSize !== 8 * 1024 * 1024 ||
      !/^incoming\/[a-f0-9-]+\/[a-f0-9-]+$/.test(value.objectKey) ||
      typeof value.uploadId !== 'string' || value.uploadId.length > 512) return null;
    return value;
  } catch { return null; }
}
function saveSession(draft: MultipartDraft | null) {
  try {
    if (draft) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Browser storage is optional. The current upload will still work.
  }
}
async function action<T>(payload: MultipartAction): Promise<T> {
  return apiRequest<T>('/api/studio/uploads/multipart', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface MultipartProgress {
  progress: (percent: number) => void;
  onRequest: (xhr: XMLHttpRequest | null) => void;
}

/** Sequential 8-MiB parts; sessions survive reloads and failed PUTs, but a
 * user must reselect the exact same local file to resume. All uploaded parts
 * are reverified through R2 ListParts rather than trusting local storage.
 */
export async function uploadAudioMultipart(
  file: File,
  options: MultipartProgress,
): Promise<{ objectKey: string }> {
  let draft = sessionFor(file);
  if (!draft) {
    const started = await action<{
      objectKey: string;
      uploadId: string;
      partSize: number;
      bytes: number;
    }>({
      action: 'start',
      filename: file.name,
      contentType: 'audio/mpeg',
      bytes: file.size,
    });
    draft = { filename: file.name, size: file.size,
      lastModified: file.lastModified, createdAt: Date.now(),
      objectKey: started.objectKey, uploadId: started.uploadId,
      partSize: started.partSize };
    saveSession(draft);
  }

  const base = { objectKey: draft.objectKey, uploadId: draft.uploadId, bytes: file.size };
  const totalParts = Math.ceil(file.size / draft.partSize);
  const { parts } = await action<{ parts: Array<{ partNumber: number; size: number; etag: string }> }>({
    action: 'list', ...base,
  });
  const done = new Map(parts.map((part) => [part.partNumber, part.size]));
  for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
    const start = (partNumber - 1) * draft.partSize;
    const end = Math.min(file.size, start + draft.partSize);
    if (done.get(partNumber) === end - start) {
      options.progress(Math.min(99, Math.floor(end / file.size * 100)));
      continue;
    }
    const { uploadUrl } = await action<{ uploadUrl: string }>({
      action: 'part', ...base, partNumber,
    });
    // Signed URL stays browser-bound; R2 receives the bytes directly.
    await uploadAudioWithProgress(
      uploadUrl,
      file.slice(start, end),
      {},
      (percent) => options.progress(Math.min(99,
        Math.floor(((start + (end - start) * percent / 100) / file.size) * 100))),
      options.onRequest,
    );
  }
  // R2 is authoritative for part ETAGs and byte lengths.
  await action({ action: 'complete', ...base });
  saveSession(null);
  options.progress(100);
  return { objectKey: draft.objectKey };
}
