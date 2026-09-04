import { createBrowserClient } from '@supabase/ssr';

export function cleanSupabaseUrl(url?: string): string {
  // Force the real URL
  return 'https://ubbwdrfcwozimdhnqqpu.supabase.co';
}

export function cleanSupabaseKey(key?: string): string {
  // Force the real Anon Key
  return 'sb_publishable_3j3m-acOC78NobFiQOFwdQ_IkRPOf-o'; // IMPORTANT: Paste your real eyJ... key here!
}

export function createClient() {
  return createBrowserClient(
    cleanSupabaseUrl(),
    cleanSupabaseKey()
  );
}