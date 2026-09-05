'use client';

import React, { useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClient } from '@/context/ClientContext';
import { createClient } from '@/utils/supabase/client';
import { validateGSTIN, extractPANFromGSTIN } from '@/lib/validations/gst';
import { completeOnboarding } from '@/app/dashboard/onboarding/actions';

export function FirstRunOnboardingModal() {
  const pathname = usePathname();
  const { clients, loading, firmName: currentFirmName, refreshClients, refreshFirms, setCurrentClient, selectedFirmId } = useClient();

  const [isDismissed, setIsDismissed] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [firmName, setFirmName] = useState(currentFirmName || 'Kapur & Associates, Chartered Accountants');
  const [frn, setFrn] = useState('108429W');
  const [partnerName, setPartnerName] = useState('CA Rajesh Kapur, FCA');

  const [clientName, setClientName] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [clientPan, setClientPan] = useState('');
  const [businessType, setBusinessType] = useState('Private Limited');

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // If on the dedicated onboarding page, already dismissed, or clients exist, don't render modal
  if (pathname === '/dashboard/onboarding' || isDismissed || loading || clients.length > 0) {
    return null;
  }

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName.trim()) {
      setError('Please provide the first client business name.');
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
          return;
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
          // Handled by router
          await refreshClients();
          await refreshFirms();
          return;
        }
      }

      // Client-side fallback to ensure state updates immediately in view
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          let targetFirmId = selectedFirmId;

          if (!targetFirmId) {
            const { data: newFirm } = await supabase
              .from('firms')
              .insert({ name: firmName })
              .select('id')
              .single();

            if (newFirm?.id) {
              targetFirmId = newFirm.id;
              await supabase.from('firm_users').insert({
                firm_id: targetFirmId,
                user_id: user.id,
                role: 'owner',
              });
            }
          }

          const pan = clientPan || extractPANFromGSTIN(clientGstin);
          const { data: newClient } = await supabase
            .from('clients')
            .insert({
              firm_id: targetFirmId,
              user_id: user.id,
              name: clientName,
              gstin: clientGstin,
              pan,
            })
            .select('*')
            .single();

          await refreshFirms();
          await refreshClients();

          if (newClient) {
            setCurrentClient({
              id: newClient.id,
              name: newClient.name,
              gstin: newClient.gstin,
              pan: newClient.pan,
              firm_id: targetFirmId,
            });
          }
        }
      } catch (clientFallbackErr: any) {
        console.warn('Onboarding state sync:', clientFallbackErr);
      }
    });
  };

  const isGstinValid = validateGSTIN(clientGstin);

  return (
    <div
      id="first-run-onboarding-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="first-run-onboarding-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 my-8 relative animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Dismiss for now"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-100 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            First-Run Practice Onboarding
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Welcome to the GST Compliance OS. To unlock reconciliation and audit reports, please set up your CA Firm profile and register your first client organization.
          </p>
        </div>

        {/* Stepper indicators */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              step === 1 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </span>
            <span>CA Firm</span>
          </div>

          <div className="w-4 h-0.5 bg-slate-200" />

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              step === 2 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span>First Client</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  CA Firm Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder="e.g. Kapur & Associates, Chartered Accountants"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Firm Reg. No. (FRN)
                  </label>
                  <input
                    type="text"
                    value={frn}
                    onChange={(e) => setFrn(e.target.value)}
                    placeholder="108429W"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Managing Partner Name
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="CA Rajesh Kapur, FCA"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 gap-1.5 rounded-lg"
                >
                  <span>Continue to Client Setup</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Client Business / Entity Name *
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Apex Manufacturing Industries Pvt Ltd"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Client 15-Digit GSTIN *
                  </label>
                  {isGstinValid && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
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
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Derived PAN
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={clientPan}
                    placeholder="Auto-derived"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 bg-slate-50 text-slate-600 rounded-lg focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Entity Type
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Private Limited">Private Limited</option>
                    <option value="Public Limited">Public Limited</option>
                    <option value="Partnership / LLP">Partnership / LLP</option>
                    <option value="Proprietorship">Proprietorship</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                  className="text-xs text-slate-600"
                >
                  &larr; Back
                </Button>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 gap-1.5 rounded-lg"
                >
                  <span>{isPending ? 'Configuring...' : 'Launch Dashboard'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>RLS Protected Workspace</span>
          </div>
          <span>ICAI Certified Architecture</span>
        </div>
      </div>
    </div>
  );
}
