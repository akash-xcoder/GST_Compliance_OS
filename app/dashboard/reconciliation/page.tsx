import React from 'react';
import { ScopedReconciliationWrapper } from '@/components/reconciliation/ScopedReconciliationWrapper';

export const dynamic = 'force-dynamic';

export default function ReconciliationPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          GST Reconciliation Engine
        </h2>
        <p className="text-slate-500 mt-1 text-sm">
          Deterministic GSTR-2B vs. Books comparison, ITC eligibility matching, and AI dispute draft generation
        </p>
      </div>

      <ScopedReconciliationWrapper />
    </div>
  );
}

