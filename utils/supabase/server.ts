import { createServerClient, createBrowserClient } from '@supabase/ssr';
import { cleanSupabaseUrl, cleanSupabaseKey } from './client';

export async function createClient() {
  const supabaseUrl = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = cleanSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (typeof window !== 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseKey);
  }

  let cookieStore: { getAll?: () => any[]; set?: (name: string, value: string, options: any) => void } | null = null;
  try {
    const { cookies } = await import('next/headers');
    cookieStore = await cookies();
  } catch {
    cookieStore = null;
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore?.set ? cookieStore.set(name, value, options) : undefined
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
