'use client';

import React, { useState, useTransition } from 'react';
import { Building2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createFirm } from './actions';

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result = await createFirm(formData);
        if (result?.error) {
          setError(result.error);
        }
      } catch (err: unknown) {
        // Next.js redirect throws a special error which should not be caught as failure
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
          return;
        }
        setError('An unexpected error occurred while creating your firm. Please try again.');
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl text-white shadow-sm mb-4">
          <div className="w-5 h-5 border-2 border-white rotate-45"></div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome to GST Compliance OS
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Complete your firm onboarding to initialize your multi-tenant workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="firmName"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                CA Firm Name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="firmName"
                  name="firmName"
                  type="text"
                  required
                  disabled={isPending}
                  placeholder="e.g. Kapur & Associates, CAs"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 bg-white"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                You will be assigned the <strong>Owner</strong> role for this practice.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed">
                Row Level Security (RLS) will partition all client entities, invoices, and reconciliation audits under this firm.
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-sm gap-2 transition-colors disabled:opacity-60"
            >
              <span>{isPending ? 'Creating Firm Workspace...' : 'Create Firm Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
