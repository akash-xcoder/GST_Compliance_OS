'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  FileCheck2,
  Sparkles,
  Briefcase,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { completeOnboarding } from '@/app/dashboard/onboarding/actions';
import { createClient } from '@/utils/supabase/client';
import { useClient } from '@/context/ClientContext';
import { validateGSTIN, extractPANFromGSTIN } from '@/lib/validations/gst';

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshClients, refreshFirms, setCurrentClient, setSelectedFirmId } = useClient();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Firm details
  const [firmName, setFirmName] = useState('Kapur & Associates, Chartered Accountants');
  const [partnerName, setPartnerName] = useState('CA Rajesh Kapur, FCA');
  const [frn, setFrn] = useState('108429W');

  // Step 2: Client details
  const [clientName, setClientName] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [clientPan, setClientPan] = useState('');
  const [businessType, setBusinessType] = useState('Private Limited');

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase().trim();
    setClientGstin(upper);
    if (upper.length >= 12) {
      const derived = extractPANFromGSTIN(upper);
      if (derived) {
        setClientPan(derived);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate Step 2 inputs
    if (!clientName.trim()) {
      setError('Please enter your first client organization name.');
      return;
    }

    if (!validateGSTIN(clientGstin)) {
      setError('Please enter a valid 15-character GSTIN (e.g. 27AAAAA0000A1Z5).');
      return;
    }

    const formData = new FormData();
    formData.set('firmName', firmName);
    formData.set('partnerName', partnerName);
    formData.set('frn', frn);
    formData.set('clientName', clientName);
    formData.set('clientGstin', clientGstin);
    formData.set('clientPan', clientPan || extractPANFromGSTIN(clientGstin));

    startTransition(async () => {
      try {
        const res = await completeOnboarding(formData);
        if (res?.error) {
          setError(res.error);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
          return;
        }

        // Client-side fallback for SPA mode
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            router.push('/login');
            return;
          }

          // 1. Create or get firm
          let firmId: string;
          const { data: userFirms } = await supabase
            .from('firm_users')
            .select('firm_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (userFirms?.firm_id) {
            firmId = userFirms.firm_id;
          } else {
            const { data: newFirm, error: firmErr } = await supabase
              .from('firms')
              .insert({ name: firmName })
              .select('id')
              .single();

            if (firmErr || !newFirm) {
              throw new Error(firmErr?.message || 'Could not create firm profile');
            }
            firmId = newFirm.id;

            await supabase.from('firm_users').insert({
              firm_id: firmId,
              user_id: user.id,
              role: 'owner',
            });
          }

          // 2. Create client
          const pan = clientPan || extractPANFromGSTIN(clientGstin);
          const { data: newClient, error: clientErr } = await supabase
            .from('clients')
            .insert({
              firm_id: firmId,
              user_id: user.id,
              name: clientName,
              gstin: clientGstin,
              pan,
            })
            .select('*')
            .single();

          if (clientErr) {
            throw new Error(clientErr.message || 'Could not register first client');
          }

          // Sync context
          setSelectedFirmId(firmId);
          await refreshFirms();
          await refreshClients();

          if (newClient) {
            setCurrentClient({
              id: newClient.id,
              name: newClient.name,
              gstin: newClient.gstin,
              pan: newClient.pan,
              firm_id: firmId,
            });
          }

          router.push('/dashboard');
        } catch (clientErr: any) {
          setError(clientErr?.message || 'Onboarding failed. Please try again.');
        }
      }
    });
  };

  const isGstinValid = validateGSTIN(clientGstin);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900 flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-sm mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome to GST Compliance OS
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            Zero-state initial setup: configure your CA Firm workspace and onboard your first client organization to unlock reconciliation and audit reports.
          </p>
        </div>

        {/* Stepper Tabs */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
              step === 1
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              1
            </span>
            <span>CA Firm Profile</span>
          </div>

          <div className="w-6 h-0.5 bg-slate-200" />

          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
              step === 2
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              2
            </span>
            <span>First Client Organization</span>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 ? (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-base font-bold text-slate-900">
                      Step 1: CA Firm Information
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    This firm name and FRN will appear on audit dossiers, GSTR-9C certifications, and client communications.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Chartered Accountancy Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder="e.g. Kapur & Associates, Chartered Accountants"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Firm Registration No. (FRN)
                    </label>
                    <input
                      type="text"
                      value={frn}
                      onChange={(e) => setFrn(e.target.value)}
                      placeholder="e.g. 108429W"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Managing Partner / CA Name
                    </label>
                    <input
                      type="text"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      placeholder="e.g. CA Rajesh Kapur, FCA"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      if (!firmName.trim()) {
                        setError('CA Firm Name is required.');
                        return;
                      }
                      setError(null);
                      setStep(2);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 gap-2 rounded-lg"
                  >
                    <span>Proceed to Add First Client</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-base font-bold text-slate-900">
                      Step 2: Add Your First Client Organization
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    Register the primary client business entity to initialize automated GSTR-2B vs 3B and Books reconciliation.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Client Legal / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Apex Manufacturing Industries Pvt Ltd"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Client 15-Digit GSTIN *
                    </label>
                    {isGstinValid && (
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Valid GSTIN
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={clientGstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="27AAAAA0000A1Z5"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono uppercase"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Example format: 27 (State) + 10-digit PAN + 1 (Entity) + Z (Default) + 5 (Checksum)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Derived PAN
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={clientPan}
                      placeholder="Auto-derived from GSTIN"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none font-mono text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Entity Category
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
                    >
                      <option value="Private Limited">Private Limited Company</option>
                      <option value="Public Limited">Public Limited Company</option>
                      <option value="Partnership / LLP">Partnership Firm / LLP</option>
                      <option value="Proprietorship">Sole Proprietorship</option>
                      <option value="Trust / Society">Trust / Society</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={isPending}
                    className="text-xs text-slate-600"
                  >
                    &larr; Back to Firm Info
                  </Button>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-6 py-2.5 gap-2 rounded-lg"
                  >
                    <span>{isPending ? 'Configuring Workspace...' : 'Launch Practice Dashboard'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Dedicated multi-tenant RLS encryption</span>
            </div>
            <span>ICAI Compliant Audit Trail</span>
          </div>
        </div>
      </div>
    </div>
  );
}
