'use client';

import React from 'react';
import { useClient } from '@/context/ClientContext';
import { ReconciliationView } from '@/components/reconciliation/ReconciliationView';
import { Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ScopedReconciliationWrapper() {
  const { selectedClient, selectedFirmId } = useClient();

  if (!selectedClient) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-900 text-lg">Select a Client Workspace</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
          Choose an active client profile from the switcher in the header to run deterministic GSTR-2B vs. Books reconciliation.
        </p>
        <Link href="/dashboard/clients">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5">
            <span>View All Clients</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Active Workspace Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            {selectedClient.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                Reconciling Active Client
              </span>
              <span className="text-xs font-semibold text-slate-900">{selectedClient.name}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              GSTIN: {selectedClient.gstin} &bull; PAN: {selectedClient.pan}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Switch client anytime from top header</span>
        </div>
      </div>

      {/* Render Reconciliation Engine Scoped to this Client */}
      <ReconciliationView
        key={selectedClient.id}
        clientId={selectedClient.id}
        clientName={selectedClient.name}
        clientGstin={selectedClient.gstin}
        initialPeriodMonth={10}
        initialPeriodYear={2026}
      />
    </div>
  );
}
