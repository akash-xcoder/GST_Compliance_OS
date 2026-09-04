// Typed wrapper around validated environment
export const appEnv = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ubbwdrfcwozimdhnqqpu.supabase.co',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_3j3m-acOC78NobFiQOFwdQ_IkRPOf-o',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};
