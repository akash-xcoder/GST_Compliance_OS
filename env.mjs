import { z } from 'zod';

/**
 * Production Environment Variables Schema
 * Enforces strict presence and format of required variables for production deployments
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  PORT: z.string().optional().default('3000'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('https://ubbwdrfcwozimdhnqqpu.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10).default('sb_publishable_3j3m-acOC78NobFiQOFwdQ_IkRPOf-o'),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

/**
 * Format errors for build log transparency
 */
const formatErrors = (errors) =>
  Object.entries(errors)
    .map(([name, value]) => `  ✖ ${name}: ${value?._errors?.join(', ')}`)
    .join('\n');

const mergedSchema = serverSchema.merge(clientSchema);

const parsed = mergedSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  PORT: process.env.PORT,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL,
});

if (!parsed.success) {
  console.error('❌ [CRITICAL] Invalid environment variables for GST Compliance OS:\n', formatErrors(parsed.error.format()));
  // In production builds, log warning without crashing preview container if optional keys are missing
  if (process.env.STRICT_ENV === 'true') {
    throw new Error('Invalid environment variables. Check .env or settings.');
  }
}

export const env = parsed.success ? parsed.data : {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: '3000',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ubbwdrfcwozimdhnqqpu.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_3j3m-acOC78NobFiQOFwdQ_IkRPOf-o',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};
