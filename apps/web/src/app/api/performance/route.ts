import { z } from 'zod';
import { demoMode } from '@/lib/env';
import { serviceClient } from '@/lib/data/supabase-store';
import { assertSameOrigin, clientIp, rateLimit } from '@/lib/api-helpers';
import { AppError } from '@/lib/errors';

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
    // The 30-day retention policy is enforced by a daily database cron job.
    // Don't add an extra DELETE query to every sampled page visit.
    return new Response(null, { status: 204, headers: responseHeaders });
  } catch (error) {
    if (error instanceof AppError) {
      return new Response(null, { status: error.status, headers: responseHeaders });
    }
    if (error instanceof SyntaxError) {
      return new Response(null, { status: 400, headers: responseHeaders });
    }
    return new Response(null, { status: 503, headers: responseHeaders });
  }
}
