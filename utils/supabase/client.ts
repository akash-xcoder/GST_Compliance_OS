import { createBrowserClient } from '@supabase/ssr';

export function cleanSupabaseUrl(url?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || url;
  if (envUrl && !envUrl.includes('placeholder') && !envUrl.includes('your-supabase')) {
    return envUrl.trim();
  }
  return 'https://ubbwdrfcwozimdhnqqpu.supabase.co';
}

export function cleanSupabaseKey(key?: string): string {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || key;
  if (envKey && !envKey.includes('placeholder') && !envKey.includes('your-supabase')) {
    return envKey.trim();
  }
  return 'sb_publishable_3j3m-acOC78NobFiQOFwdQ_IkRPOf-o';
}

// Export function so every call creates a fresh client that reads up-to-date session cookies
export function createClient() {
  return createBrowserClient(
    cleanSupabaseUrl(),
    cleanSupabaseKey()
  );
}

export { createBrowserClient };