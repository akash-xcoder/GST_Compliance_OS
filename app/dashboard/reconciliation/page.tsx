import React from 'react';
import { FileSpreadsheet, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReconciliationPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            GST Reconciliation Engine
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            Deterministic GSTR-2B vs. Books comparison & ITC matching
          </p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow-sm gap-1.5 self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" />
          <span>Run Reconciliation</span>
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Reconciliation Engine</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Automated cross-matching between 2B auto-drafted ITC and accounting books.
        </p>
      </div>
    </div>
  );
}
