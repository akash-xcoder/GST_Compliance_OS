'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Building2, Lock, Mail, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signUp } from '@/app/actions/auth';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [firmName, setFirmName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await signUp(formData);
        if (result?.error) {
          setError(result.error);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
          return;
        }

        // Client-side fallback for SPA mode
        try {
          const supabase = createClient();
          const { data, error: clientSignupError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                firm_name: firmName,
              },
            },
          });

          if (clientSignupError) {
            setError(clientSignupError.message || 'Failed to register account.');
          } else {
            // Pre-create firm if possible
            if (data.user && firmName) {
              const { data: newFirm } = await supabase
                .from('firms')
                .insert({ name: firmName })
                .select('id')
                .single();

              if (newFirm?.id) {
                await supabase.from('firm_users').insert({
                  firm_id: newFirm.id,
                  user_id: data.user.id,
                  role: 'owner',
                });
              }
            }
            router.push('/dashboard/onboarding');
          }
        } catch (clientErr: any) {
          setError(clientErr?.message || 'Failed to complete registration.');
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
          Create Chartered Accountant Practice Workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl sm:px-10 border border-slate-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Register CA Firm Workspace</h2>
            <p className="text-xs text-slate-500 mt-1">
              Set up a multi-tenant audit portal for your firm, partners, and client entities
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="firmName">
                CA Practice / Firm Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="firmName"
                  name="firmName"
                  type="text"
                  required
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="e.g. Kapur & Associates, CAs"
                  disabled={isPending}
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="fullName">
                Managing Partner / CA Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="CA Rajesh Kapur, FCA"
                  disabled={isPending}
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="email">
                Practice Email
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
                  placeholder="partner@kapurassociates.in"
                  disabled={isPending}
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
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
              <span>{isPending ? 'Creating Account...' : 'Create Firm Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Already registered your practice?</span>
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold"
            >
              Sign In &rarr;
            </Link>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Assigned Owner role &bull; Dedicated cryptographic tenant isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
