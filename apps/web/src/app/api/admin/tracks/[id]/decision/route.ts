import { reviewDecisionInput } from '@ai-music/contracts';
import { mutateDb } from '@/lib/data/db';
import { loadDbFromSupabase, persistChanges } from '@/lib/data/supabase-store';
import { demoMode } from '@/lib/env';
import { reviewTrack } from '@/lib/data/mutations';
import { presignR2OriginalGet, presignR2StreamingPut } from '@/lib/storage/r2-presign';
import { AppError } from '@/lib/errors';
import {
  assertSameOrigin,
  jsonError,
  jsonOk,
  parseBody,
  requireRole,
} from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireRole(['admin', 'super_admin']);
    const { id } = await context.params;
    const input = await parseBody(request, reviewDecisionInput);
    let track;
    if (demoMode) {
      track = mutateDb((db) => reviewTrack(db, user, id, input.decision, input.reason));
    } else {
      const before = await loadDbFromSupabase();
      const after = structuredClone(before);
      const candidate = after.tracks.find((item) => item.id === id);
      if (input.decision === 'approve' && candidate?.audio?.processingStatus !== 'ready') {
        // MP3 originals can be served directly while the external transcoding
        // worker is unavailable. Copy into the private streaming bucket first.
        // Never label the untranscoded original as a 320 kbps rendition.
        const original = candidate?.audio;
        if (!original || original.format !== 'mp3' || !original.objectKey ||
            !/^incoming[/][a-f0-9-]+[/][a-f0-9-]+$/.test(original.objectKey) ||
            !original.sha256 || !/^[a-f0-9]{64}$/.test(original.sha256)) {
          throw new AppError('audio_not_ready', 'Audio processing has not finished. Only verified MP3 originals can be approved until the media worker is available.', 409);
        }
        const source = await fetch(presignR2OriginalGet(original.objectKey), { cache: 'no-store' });
        if (!source.ok || !source.body) throw new AppError('audio_unavailable', 'Original audio could not be fetched from storage.', 503);
        const bytes = Number(source.headers.get('content-length'));
        if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes !== original.bytes) {
          await source.body.cancel();
          throw new AppError('audio_invalid', 'Original audio size could not be verified.', 422);
        }
        const objectKey = `${candidate.id}/${original.sha256}-original.mp3`;
        const upload = await fetch(presignR2StreamingPut(objectKey), {
          method: 'PUT',
          body: source.body,
          // Node fetch requires duplex when forwarding a readable stream.
          duplex: 'half',
          headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(bytes) },
        } as RequestInit & { duplex: 'half' });
        if (!upload.ok) throw new AppError('audio_copy_failed', 'Could not prepare the MP3 for streaming.', 503);
        candidate.audio = {
          ...original,
          kind: 'rendition',
          objectKey,
          processingStatus: 'ready',
          // Unknown bitrate is not a claim of high quality.
          bitrateKbps: original.bitrateKbps,
        };
        candidate.qualityLabel = 'standard';
      }
      track = reviewTrack(after, user, id, input.decision, input.reason);
      await persistChanges(before, after);
    }
    return jsonOk({ track });
  } catch (error) {
    return jsonError(error);
  }
}
