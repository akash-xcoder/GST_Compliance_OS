import React from 'react';
import { Users, FileText, AlertTriangle, CheckCircle2, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 max-w-7xl">
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Compliance Overview
            </h2>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded uppercase tracking-wider">
              V1 Mockup
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-sm">
            Centralized multi-entity tax filing, document extraction, and GST reconciliation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow-sm gap-1.5">
              <Plus className="w-4 h-4" />
              <span>New Client Registration</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Required Metric Cards */}
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
          <p className="text-3xl font-bold mt-3 text-slate-900">42</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="text-emerald-600 font-semibold">&uarr; 3</span>
            <span>onboarded this month</span>
          </div>
        </div>

        {/* Card 2: Pending Documents */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Documents
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3 text-slate-900">18</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
            <span>Awaiting client upload / OCR</span>
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
          <p className="text-3xl font-bold mt-3 text-slate-900">7</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
            <span>GSTR-2B vs. Books mismatches</span>
          </div>
        </div>

        {/* Card 4: Ready to File */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ready to File
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-3 text-slate-900">25</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span>100% ITC reconciled</span>
          </div>
        </div>
      </div>

      {/* Critical Reconciliation Queue Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Critical Reconciliation Queue</h3>
            <p className="text-xs text-slate-500 mt-0.5">Deterministic 2B vs. Books comparison status</p>
          </div>
          <Link
            href="/dashboard/reconciliation"
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
          >
            <span>View all audits</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Client Entity</th>
                <th className="px-6 py-3">Period</th>
                <th className="px-6 py-3">Logic Status</th>
                <th className="px-6 py-3">Variance</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">Acme Manufacturing Ltd.</div>
                  <div className="text-xs text-slate-500 font-mono">GSTIN: 27AAAAA0000A1Z5</div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-700">Oct 2023</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Matched
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">&inr;0.00</td>
                <td className="px-6 py-4">
                  <Link
                    href="/dashboard/reconciliation"
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-xs"
                  >
                    Draft Report
                  </Link>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">Horizon Logistics LLP</div>
                  <div className="text-xs text-slate-500 font-mono">GSTIN: 19BBBBB1111B2Z6</div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-700">Oct 2023</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Missing PR
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs font-semibold text-rose-600">&inr;4,25,900.00</td>
                <td className="px-6 py-4">
                  <Link
                    href="/dashboard/reconciliation"
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-xs"
                  >
                    Nudge Client
                  </Link>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">Stellar Global Solutions</div>
                  <div className="text-xs text-slate-500 font-mono">GSTIN: 08CCCCC2222C3Z7</div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-700">Sep 2023</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    AI Extracting
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-400">Calculating...</td>
                <td className="px-6 py-4">
                  <span className="text-slate-400 font-medium text-xs">Processing</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
