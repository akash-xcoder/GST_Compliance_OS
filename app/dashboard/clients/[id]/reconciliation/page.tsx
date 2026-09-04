import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { ReconciliationView } from '@/components/reconciliation/ReconciliationView';
import { getReconciliationData } from '../reconcile-actions';
import { ArrowLeft, Building2, Hash, CreditCard, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientReconciliationPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Fetch firm membership
  const { data: membership } = await supabase
    .from('firm_users')
    .select('firm_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.firm_id) {
    redirect('/onboarding');
  }

  // 3. Fetch client details
  let client = {
    id,
    name: 'Acme Manufacturing Ltd.',
    gstin: '27AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
  };

  try {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id, name, gstin, pan')
      .eq('id', id)
      .eq('firm_id', membership.firm_id)
      .maybeSingle();

    if (clientRow) {
      client = clientRow;
    }
  } catch (err) {
    console.error('Error fetching client for reconciliation:', err);
  }

  // 4. Pre-fetch initial reconciliation data (October 2023)
  const initialReconData = await getReconciliationData(id, 10, 2023);

  const stateCode = client.gstin.slice(0, 2);

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/clients/${id}`}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link href="/dashboard/clients" className="hover:text-slate-800">
                Clients
              </Link>
              <span>/</span>
              <Link href={`/dashboard/clients/${id}`} className="hover:text-slate-800">
                {client.name}
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-semibold">GSTR-2B Reconciliation</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              GST Reconciliation Engine
            </h1>
          </div>
        </div>

        {/* Client quick info badge */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 shadow-xs">
            GSTIN: <span className="font-semibold text-slate-900">{client.gstin}</span>
          </div>
          <Link href={`/dashboard/clients/${id}`}>
            <Button variant="outline" size="sm" className="text-xs h-8">
              Client Workspace
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Reconciliation View */}
      <ReconciliationView
        clientId={id}
        clientName={client.name}
        clientGstin={client.gstin}
        initialPeriodMonth={10}
        initialPeriodYear={2023}
        initialData={initialReconData}
      />
    </div>
  );
}
