import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env, supabaseConfigured } from '@/lib/env';

export async function getSupabaseServer() {
  if (!supabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }>,
      ) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component; middleware or a route handler can set cookies.
        }
      },
    },
  });
}
