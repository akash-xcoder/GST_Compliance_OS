import React from 'react';
import { Users, FileText, AlertTriangle, CheckCircle2, ArrowRight, Plus, Upload, Building2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firmId: string | null = null;
  let clientsCount = 0;
  let documentsCount = 0;
  let exceptionsCount = 0;
  let reconciledCount = 0;
  let clientsList: any[] = [];

  if (user) {
    const { data: membership } = await supabase
      .from('firm_users')
      .select('firm_id')
      .eq('user_id', user.id)
      .maybeSingle();

    firmId = membership?.firm_id || null;

    if (firmId) {
      // 1. Fetch real clients count & list
      const { data: clientsData, count: cCount } = await supabase
        .from('clients')
        .select('id, name, gstin, pan, created_at', { count: 'exact' })
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false });

      clientsCount = cCount || (clientsData ? clientsData.length : 0);
      clientsList = clientsData || [];

      // 2. Fetch documents count
      const { count: dCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmId);

      documentsCount = dCount || 0;

      // 3. Fetch invoices / exception stats
      const { count: eCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmId)
        .in('match_status', ['MISMATCH', 'MISSING_IN_BOOKS', 'MISSING_IN_2B']);

      exceptionsCount = eCount || 0;

      // 4. Fetch matched count
      const { count: mCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmId)
        .eq('match_status', 'MATCHED');

      reconciledCount = mCount || 0;
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl">
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Compliance Overview
            </h2>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded uppercase tracking-wider border border-emerald-200">
              Live Production
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-sm">
            Centralized multi-entity tax filing, document extraction, and GST reconciliation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dashboard/reports">
            <Button variant="outline" className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-lg font-semibold text-xs shadow-xs gap-1.5">
              <span>Audit Dossiers &amp; UDIN &rarr;</span>
            </Button>
          </Link>
          <Link href="/dashboard/compliance">
            <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg font-semibold text-xs shadow-xs gap-1.5">
              <span>Deadlines &amp; Calendar &rarr;</span>
            </Button>
          </Link>
          <Link href="/dashboard/clients">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-sm gap-1.5">
              <Plus className="w-4 h-4" />
              <span>New Client</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Live Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Clients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Clients
            </p>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3 text-slate-900">{clientsCount}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Registered client organizations</span>
          </div>
        </div>

        {/* Card 2: Ingested Documents */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Documents Ingested
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3 text-slate-900">{documentsCount}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Purchase registers &amp; portal files</span>
          </div>
        </div>

        {/* Card 3: Exceptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Exceptions
            </p>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3 text-slate-900">{exceptionsCount}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
            <span>GSTR-2B vs. Books mismatches</span>
          </div>
        </div>

        {/* Card 4: Reconciled Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Reconciled Invoices
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3 text-slate-900">{reconciledCount}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span>100% deterministic matches</span>
          </div>
        </div>
      </div>

      {/* Client Audit Queue Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Client Organizations &amp; Audit Queue</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live multi-entity reconciliation and compliance tracking</p>
          </div>
          <Link
            href="/dashboard/clients"
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
          >
            <span>View all clients</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {clientsList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">No Client Organizations Registered</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
              Your practice workspace is clean. Onboard your first client organization to begin ingesting purchase registers, 2B portal returns, and generating audit dossiers.
            </p>
            <Link href="/dashboard/onboarding">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Onboard First Client</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Client Entity</th>
                  <th className="px-6 py-3">GSTIN / PAN</th>
                  <th className="px-6 py-3">Audit Workspace</th>
                  <th className="px-6 py-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {clientsList.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{client.name}</div>
                      <div className="text-xs text-slate-400">
                        Added on {new Date(client.created_at || Date.now()).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-semibold text-slate-800">{client.gstin}</div>
                      <div className="text-[11px] font-mono text-slate-400">PAN: {client.pan || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        Active Tenant
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors"
                        >
                          Reconciliation
                        </Link>
                        <Link
                          href={`/dashboard/documents`}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        >
                          Upload Doc
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
