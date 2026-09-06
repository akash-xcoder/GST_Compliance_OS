'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Building2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Hash,
  Calendar,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateGSTIN, extractPANFromGSTIN, validatePAN } from '@/lib/validations/gst';
import { createClient } from '@/utils/supabase/client';
import { createClientAction, deleteClient } from './actions';

export interface ClientItem {
  id: string;
  name: string;
  gstin: string;
  pan: string;
  created_at?: string;
}

interface ClientListClientProps {
  initialClients: ClientItem[];
  firmName?: string;
}

export function ClientListClient({ initialClients, firmName = 'CA Practice' }: ClientListClientProps) {
  const [clients, setClients] = useState<ClientItem[]>(initialClients);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states for Add Client Modal
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [formError, setFormError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Instant GSTIN validation feedback
  const isGstinValid = gstin.length === 15 && validateGSTIN(gstin);
  const isGstinTouched = gstin.length > 0;

  // Handler for GSTIN change with auto-population of PAN
  const handleGstinChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
    setGstin(upperValue);

    // If GSTIN has at least 12 characters, extract PAN
    if (upperValue.length >= 12) {
      const derivedPan = extractPANFromGSTIN(upperValue);
      if (validatePAN(derivedPan)) {
        setPan(derivedPan);
      }
    } else if (upperValue.length === 0) {
      setPan('');
    }
  };

  const handlePanChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 10);
    setPan(upperValue);
  };

  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Business name is required.');
      return;
    }

    if (!validateGSTIN(gstin)) {
      setFormError('Please enter a valid 15-character GSTIN (e.g. 27AAAAA0000A1Z5).');
      return;
    }

    const effectivePan = pan || extractPANFromGSTIN(gstin);
    if (!validatePAN(effectivePan)) {
      setFormError('Invalid 10-character PAN format (e.g. AAAAA0000A).');
      return;
    }

    startTransition(async () => {
      try {
        // Call createClient() directly inside the form submission handler to ensure fresh cookies
        const supabase = createClient();

        // 1. Await supabase.auth.getUser() to get the securely verified current user
        let {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        // Fallback: If getUser() returns null in browser, check getSession() so session cookies are seamlessly read
        if (!user) {
          const { data: sessionData } = await supabase.auth.getSession();
          user = sessionData?.session?.user || null;
        }

        // 2. Check if the user exists (throw an error if not)
        if (!user) {
          setFormError('You must be logged in to register a client!');
          return;
        }

        // 3. Explicitly pass firm_id: user.id in the .insert() payload so it perfectly matches the RLS requirement (firm_id = auth.uid())
        const { data: newClientRow, error: insertError } = await supabase
          .from('clients')
          .insert({
            name: name.trim(),
            gstin,
            pan: effectivePan,
            firm_id: user.id,
            user_id: user.id,
          })
          .select('id')
          .single();

        if (insertError) {
          // If RLS or constraint error, fall back to server action as backup
          const formData = new FormData();
          formData.append('name', name.trim());
          formData.append('gstin', gstin);
          formData.append('pan', effectivePan);

          const result = await createClientAction(null, formData);
          if (result.error) {
            setFormError(result.error);
            return;
          }
        }

        // Add to state and close
        const newClient: ClientItem = {
          id: newClientRow?.id || `client-${Date.now()}`,
          name: name.trim(),
          gstin,
          pan: effectivePan,
          created_at: new Date().toISOString(),
        };
        setClients((prev) => [newClient, ...prev]);
        setName('');
        setGstin('');
        setPan('');
        setIsAddModalOpen(false);
      } catch (err: any) {
        setFormError(err?.message || 'Failed to register client entity.');
      }
    });
  };

  const handleDeleteClient = async (clientId: string) => {
    startTransition(async () => {
      const result = await deleteClient(clientId);
      if (!result.error) {
        setClients((prev) => prev.filter((c) => c.id !== clientId));
        setDeleteConfirmId(null);
      } else {
        alert(result.error);
      }
    });
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.pan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Client Organizations
            </h2>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded uppercase tracking-wider">
              {clients.length} {clients.length === 1 ? 'Entity' : 'Entities'}
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-sm">
            Manage multi-entity taxpayer portfolios, GSTIN compliance, and isolated client workspaces.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormError('');
            setIsAddModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow-sm gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by client name, GSTIN, or PAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Firm-scoped RLS active</span>
        </div>
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchQuery ? 'No matching clients found' : 'No clients registered yet'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
            {searchQuery
              ? `No taxpayer organization matched "${searchQuery}". Try searching with a different business name, GSTIN, or PAN.`
              : `Add your first client to start automated GST reconciliation, document ingestion, and invoice extraction under ${firmName}.`}
          </p>
          {!searchQuery && (
            <div className="mt-6">
              <Button
                onClick={() => {
                  setFormError('');
                  setIsAddModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs sm:text-sm gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register First Client</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Client List Table */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Client Entity</th>
                  <th className="px-6 py-3.5">GSTIN</th>
                  <th className="px-6 py-3.5">PAN</th>
                  <th className="px-6 py-3.5">Date Added</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {filteredClients.map((client) => {
                  const formattedDate = client.created_at
                    ? new Date(client.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recent';

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/dashboard/clients/${client.id}`}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                            >
                              {client.name}
                            </Link>
                            <div className="text-xs text-slate-400">Regular Taxpayer</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 font-mono text-xs font-semibold text-slate-800 border border-slate-200">
                          <Hash className="w-3 h-3 text-slate-400" />
                          <span>{client.gstin}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 font-mono text-xs font-semibold text-amber-900 border border-amber-200">
                          <CreditCard className="w-3 h-3 text-amber-600" />
                          <span>{client.pan}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/clients/${client.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs font-medium text-indigo-700 bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50 hover:text-indigo-800 gap-1.5 cursor-pointer"
                            >
                              <span>Open Workspace</span>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </Link>

                          {deleteConfirmId === client.id ? (
                            <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg">
                              <span className="text-[11px] font-semibold text-rose-700 px-1">
                                Confirm?
                              </span>
                              <button
                                disabled={isPending}
                                onClick={() => handleDeleteClient(client.id)}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold cursor-pointer disabled:opacity-50"
                              >
                                {isPending ? '...' : 'Yes'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 text-slate-600 hover:text-slate-800 text-[10px] font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirmId(client.id)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 border-slate-200 cursor-pointer"
                              title="Delete Client"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add Client Organization</h3>
                  <p className="text-xs text-slate-500">Register a new taxpayer entity under your CA firm</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddClientSubmit} className="mt-5 space-y-4">
              {/* Business Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Client Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Technologies Pvt Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                />
              </div>

              {/* GSTIN Field with instant validation */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    GSTIN (15 Digits) <span className="text-rose-500">*</span>
                  </label>
                  {isGstinTouched && (
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-1 ${
                        isGstinValid ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {isGstinValid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Valid GSTIN Format</span>
                        </>
                      ) : (
                        <span>{15 - gstin.length > 0 ? `${15 - gstin.length} chars left` : 'Invalid format'}</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 font-mono text-sm uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400 font-mono">
                  State (2) + PAN (10) + Entity (1) + Z (1) + Check (1)
                </p>
              </div>

              {/* PAN Field with auto-derived indicator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    PAN (10 Characters)
                  </label>
                  {pan && validatePAN(pan) && (
                    <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Auto-derived from GSTIN</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="Auto-populated (e.g. AAAAA0000A)"
                    value={pan}
                    onChange={(e) => handlePanChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 font-mono text-sm uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  This client and its documents will be securely isolated to <strong>{firmName}</strong> via Supabase Row-Level Security.
                </span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isPending ? 'Registering...' : 'Register Client'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
