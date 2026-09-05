'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signIn } from '@/app/actions/auth';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error');
      if (urlError) {
        setError(decodeURIComponent(urlError));
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        // First try server action
        const result = await signIn(formData);
        if (result?.error) {
          setError(result.error);
        }
      } catch (err: unknown) {
        // If Next.js redirect was thrown, let it navigate
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
          return;
        }

        // Fallback to client-side Supabase auth if in SPA or API route bridge
        try {
          const supabase = createClient();
          const { error: clientAuthError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (clientAuthError) {
            setError(clientAuthError.message || 'Invalid email or password.');
          } else {
            router.push('/dashboard');
          }
        } catch (clientErr: any) {
          setError(clientErr?.message || 'Failed to authenticate. Please check your credentials.');
        }
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 font-sans text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <div className="w-4 h-4 border-2 border-white rotate-45"></div>
          </div>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          GST Compliance OS
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          CA Firm Multi-Tenant Practice Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl sm:px-10 border border-slate-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Sign in to your practice</h2>
            <p className="text-xs text-slate-500 mt-1">
              Access your CA firm workspace, client entities, and audit reconciliation ledger
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Continue with Google OAuth Button */}
          <div className="mb-5">
            <GoogleSignInButton
              label="Continue with Google"
              onError={(msg) => setError(msg)}
            />
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2.5 text-slate-400 font-semibold tracking-wider">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="email">
                CA Firm / Practitioner Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ca.partner@firm.in"
                  disabled={isPending}
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isPending}
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white disabled:opacity-60"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-sm py-2.5 rounded-lg mt-2 cursor-pointer transition-all disabled:opacity-60"
            >
              <span>{isPending ? 'Signing In...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need to register your CA practice?</span>
            <Link
              href="/signup"
              className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold"
            >
              Create Firm Account &rarr;
            </Link>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Supabase SSR session protected &bull; Multi-tenant RLS enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
