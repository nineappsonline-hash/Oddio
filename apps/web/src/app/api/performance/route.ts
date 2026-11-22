import { z } from 'zod';
import { demoMode } from '@/lib/env';
import { serviceClient } from '@/lib/data/supabase-store';
import { assertSameOrigin, clientIp, rateLimit } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const measurement = z
  .object({
    name: z.enum(['lcp', 'cls', 'fcp', 'long_task', 'audio_startup', 'audio_rebuffer']),
    value: z.number().finite().min(0).max(120000),
  })
  .strict();

const payloadSchema = z
  .object({
    metrics: z.array(measurement).min(1).max(12),
    pageGroup: z.enum(['home', 'discover', 'search', 'podcasts', 'other']),
    deviceGroup: z.enum(['mobile', 'desktop']),
    browserGroup: z.enum(['safari', 'firefox', 'chromium', 'other']),
    locale: z.enum(['ar', 'en']),
  })
  .strict();

const responseHeaders = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`performance:${clientIp(request)}`, 30, 60_000);
    if (Number(request.headers.get('content-length') ?? '0') > 4096) {
      return new Response(null, { status: 413, headers: responseHeaders });
    }
    const input = payloadSchema.safeParse(await request.json());
    if (!input.success) {
      return new Response(null, { status: 400, headers: responseHeaders });
    }
    // Monitoring never blocks listening. Demo mode intentionally does not
    // write to the production analytics table.
    if (demoMode) return new Response(null, { status: 204, headers: responseHeaders });
    const { pageGroup, deviceGroup, browserGroup, locale } = input.data;
    const rows = input.data.metrics.map((metric) => ({
      metric: metric.name,
      value: Number(metric.value.toFixed(3)),
      page_group: pageGroup,
      device_group: deviceGroup,
      browser_group: browserGroup,
      locale,
    }));
    const client = serviceClient();
    const { error } = await client.from('client_performance_samples').insert(rows);
    if (error) throw error;
    // pg_cron is not installed on the connected project. Periodically prune
    // the time-indexed private table while there is incoming sample traffic.
    if (Math.random() < 0.02) {
      void Promise.resolve(
        client
          .from('client_performance_samples')
          .delete()
          .lt('recorded_at', new Date(Date.now() - 30 * 86400_000).toISOString()),
      ).catch(() => undefined);
    }
    return new Response(null, { status: 204, headers: responseHeaders });
  } catch {
    return new Response(null, { status: 503, headers: responseHeaders });
  }
}
