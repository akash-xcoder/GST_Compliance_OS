'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Filter,
  Download,
  Search,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  Loader2,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  Copy,
  Check,
  Lightbulb,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  runReconciliation,
  generateExceptionExplanation,
  ReconcileResult,
  ReconScorecard,
  ReconException,
  ReconStatus,
} from '@/app/dashboard/clients/[id]/reconcile-actions';

interface ReconciliationViewProps {
  key?: React.Key;
  clientId: string;
  clientName: string;
  clientGstin: string;
  initialPeriodMonth?: number;
  initialPeriodYear?: number;
  initialData?: ReconcileResult;
}

export function formatINR(val: number): string {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const formatted = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

const MONTHS = [
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
];

const YEARS = [2024, 2023, 2022];

export function ReconciliationView({
  clientId,
  clientName,
  clientGstin,
  initialPeriodMonth = 10,
  initialPeriodYear = 2023,
  initialData,
}: ReconciliationViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(initialPeriodMonth);
  const [selectedYear, setSelectedYear] = useState<number>(initialPeriodYear);
  const [isPending, startTransition] = useTransition();
  const [reconData, setReconData] = useState<ReconcileResult | null>(initialData || null);
  const [filterType, setFilterType] = useState<'all' | 'missing_in_2b' | 'value_mismatch' | 'missing_in_books' | 'matched'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [analyzingRowId, setAnalyzingRowId] = useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleRowExpand = (id: string) => {
    setExpandedRowIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAnalyzeException = async (invoiceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRowIds((prev) => ({ ...prev, [invoiceId]: true }));
    setAnalyzingRowId(invoiceId);
    try {
      const res = await generateExceptionExplanation(invoiceId);
      if (res.success && res.explanation) {
        setAiExplanations((prev) => ({ ...prev, [invoiceId]: res.explanation! }));
        setToastMessage('✨ AI CA Explanation generated');
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        setToastMessage(res.error || 'Failed to generate AI analysis');
      }
    } catch (err: any) {
      console.error('Error in handleAnalyzeException:', err);
      setToastMessage(err?.message || 'Error executing AI analysis');
    } finally {
      setAnalyzingRowId(null);
    }
  };

  const handleCopyExplanation = (id: string, text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRunReconciliation = () => {
    startTransition(async () => {
      try {
        const result = await runReconciliation(clientId, selectedMonth, selectedYear);
        setReconData(result);
        setToastMessage(
          `Reconciliation completed for ${MONTHS.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`
        );
        setTimeout(() => setToastMessage(null), 4000);
      } catch (err: any) {
        console.error('Reconciliation error:', err);
        setToastMessage(`Error: ${err?.message || 'Failed to run reconciliation'}`);
      }
    });
  };

  // If initialData wasn't provided, trigger default on first mount if empty
  React.useEffect(() => {
    if (!reconData) {
      handleRunReconciliation();
    }
  }, []);

  const summary: ReconScorecard = reconData?.summary || {
    booksTotalITC: 0,
    gstr2bTotalITC: 0,
    itcDifference: 0,
    booksTaxableTotal: 0,
    gstr2bTaxableTotal: 0,
    taxableDifference: 0,
    matchedCount: 0,
    missingIn2bCount: 0,
    valueMismatchCount: 0,
    missingInBooksCount: 0,
    totalBooksCount: 0,
    total2bCount: 0,
  };

  const exceptions: ReconException[] = reconData?.exceptions || [];
  const matchedList = reconData?.matchedInvoices || [];

  // Filter exceptions
  const filteredExceptions = exceptions.filter((ex) => {
    if (filterType !== 'all' && ex.recon_status !== filterType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ex.invoice_number.toLowerCase().includes(q) ||
        ex.supplier_gstin.toLowerCase().includes(q) ||
        (ex.supplier_name && ex.supplier_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const hasDiscrepancy = Math.abs(summary.itcDifference) > 1.0;

  return (
    <div className="space-y-6">
      {/* Top Header & Run Reconciliation Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Deterministic GST Reconciliation Engine
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated Purchase Register vs. GSTR-2B matching strictly calculated using Decimal arithmetic
                </p>
              </div>
            </div>
          </div>

          {/* Period Selector & Trigger Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1">
              <select
                aria-label="Tax Period Month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-700 px-2 py-1.5 rounded-lg border-0 focus:ring-0 cursor-pointer"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-slate-300">|</span>
              <select
                aria-label="Tax Period Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-700 px-2 py-1.5 rounded-lg border-0 focus:ring-0 cursor-pointer"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    FY {y}-{String(y + 1).slice(-2)}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleRunReconciliation}
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 gap-2 cursor-pointer shadow-sm transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing Matches...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Reconciliation</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-indigo-400 hover:text-indigo-700 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Books Total ITC */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Books Total ITC
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              Purchase Register
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tracking-tight">
              {formatINR(summary.booksTotalITC)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>{summary.totalBooksCount} book invoices</span>
              <span className="text-slate-300">&bull;</span>
              <span>Taxable: {formatINR(summary.booksTaxableTotal)}</span>
            </p>
          </div>
        </div>

        {/* 2. GSTR-2B Total ITC */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              GSTR-2B Total ITC
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
              Portal Available
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tracking-tight">
              {formatINR(summary.gstr2bTotalITC)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <span>{summary.total2bCount} portal invoices</span>
              <span className="text-slate-300">&bull;</span>
              <span>Taxable: {formatINR(summary.gstr2bTaxableTotal)}</span>
            </p>
          </div>
        </div>

        {/* 3. The Mathematical Difference */}
        <div
          className={`border rounded-2xl p-5 shadow-xs relative overflow-hidden ${
            hasDiscrepancy
              ? 'bg-rose-50/50 border-rose-200 text-rose-950'
              : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Mathematical Difference
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                hasDiscrepancy
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {hasDiscrepancy ? (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  <span>Variance Detected</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Balanced</span>
                </>
              )}
            </span>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
                hasDiscrepancy ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {formatINR(summary.itcDifference)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {summary.itcDifference > 1.0 ? (
                <span className="font-semibold text-rose-700">
                  Books exceed GSTR-2B by {formatINR(summary.itcDifference)} (At risk of Sec 16(2)(aa) notice)
                  <Link
                    href="/dashboard/scrutiny"
                    className="inline-flex items-center gap-1 font-bold text-rose-800 hover:text-rose-950 underline ml-1.5"
                  >
                    Open Defense Studio &rarr;
                  </Link>
                </span>
              ) : summary.itcDifference < -1.0 ? (
                <span className="font-semibold text-amber-700">
                  Unclaimed credit of {formatINR(Math.abs(summary.itcDifference))} in GSTR-2B
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">
                  Zero net variance between Books and GSTR-2B
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Status Breakdown Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Matched */}
        <button
          onClick={() => setFilterType(filterType === 'matched' ? 'all' : 'matched')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterType === 'matched'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Matched</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1.5">
            {summary.matchedCount}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
            100% Eligible ITC Claim
          </p>
        </button>

        {/* Missing in 2B */}
        <button
          onClick={() => setFilterType(filterType === 'missing_in_2b' ? 'all' : 'missing_in_2b')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterType === 'missing_in_2b'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Missing in 2B</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono mt-1.5">
            {summary.missingIn2bCount}
          </div>
          <p className="text-[11px] text-rose-700 font-medium mt-0.5">
            Vendor Non-Filing Action
          </p>
        </button>

        {/* Value Mismatch */}
        <button
          onClick={() => setFilterType(filterType === 'value_mismatch' ? 'all' : 'value_mismatch')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterType === 'value_mismatch'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Value Mismatch</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1.5">
            {summary.valueMismatchCount}
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-0.5">
            Taxable or Tax Diff &gt; ₹1
          </p>
        </button>

        {/* Missing in Books (Optional extra credit) */}
        <button
          onClick={() => setFilterType(filterType === 'missing_in_books' ? 'all' : 'missing_in_books')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterType === 'missing_in_books'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Missing in Books</span>
            <Info className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 font-mono mt-1.5">
            {summary.missingInBooksCount}
          </div>
          <p className="text-[11px] text-indigo-700 font-medium mt-0.5">
            Unclaimed in Purchase Reg
          </p>
        </button>
      </div>

      {/* Exception Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900">
                {filterType === 'all'
                  ? 'Reconciliation Exceptions'
                  : filterType === 'missing_in_2b'
                  ? 'Exceptions: Missing in GSTR-2B'
                  : filterType === 'value_mismatch'
                  ? 'Exceptions: Value Mismatches'
                  : filterType === 'missing_in_books'
                  ? 'Exceptions: Missing in Books'
                  : 'Matched Invoices'}
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                {filteredExceptions.length} Discrepancies
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Only showing invoices with mismatches or missing counter-party filings. Discrepancies are highlighted in red for rapid audit verification.
            </p>
          </div>

          {/* Search & Clear Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice or GSTIN..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-60"
              />
            </div>
            {filterType !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterType('all')}
                className="text-xs h-8 border-slate-200"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* Exceptions Data Table */}
        {filteredExceptions.length > 0 ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="w-10 py-3 px-3 rounded-l-lg text-center"></th>
                  <th className="py-3 px-4">Invoice Details</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Books Value</th>
                  <th className="py-3 px-4">GSTR-2B Value</th>
                  <th className="py-3 px-4 text-center">Recon Status</th>
                  <th className="py-3 px-4">Audit Discrepancy Note</th>
                  <th className="py-3 px-4 text-right rounded-r-lg">AI CA Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExceptions.map((item) => {
                  const isTaxableDiff = Math.abs(item.taxable_diff) > 1.0;
                  const isItcDiff = Math.abs(item.itc_diff) > 1.0;
                  const explanation = aiExplanations[item.id] || item.ai_explanation;
                  const isAnalyzing = analyzingRowId === item.id;
                  const isExpanded = !!expandedRowIds[item.id];

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`transition-colors bg-white ${
                          isExpanded ? 'bg-purple-50/20' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Expand Toggle */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(item.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse row' : 'Expand row'}
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Invoice Details */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {item.invoice_number}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{item.invoice_date}</span>
                          </div>
                        </td>

                        {/* Supplier GSTIN */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.supplier_name && (
                            <div className="font-semibold text-slate-800 text-xs truncate max-w-[180px]">
                              {item.supplier_name}
                            </div>
                          )}
                          <div className="font-mono text-slate-600 text-[11px]">
                            {item.supplier_gstin}
                          </div>
                        </td>

                        {/* Books Value */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-900">
                            Taxable: {formatINR(item.books_taxable)}
                          </div>
                          <div
                            className={`font-mono text-[11px] mt-0.5 ${
                              isItcDiff ? 'text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded inline-block' : 'text-slate-500'
                            }`}
                          >
                            ITC: {formatINR(item.books_itc)}
                          </div>
                        </td>

                        {/* 2B Value */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div
                            className={`font-mono font-semibold ${
                              item.recon_status === 'missing_in_2b'
                                ? 'text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded inline-block'
                                : isTaxableDiff
                                ? 'text-amber-700 font-bold bg-amber-50 px-1 py-0.5 rounded inline-block'
                                : 'text-slate-900'
                            }`}
                          >
                            Taxable: {formatINR(item.gstr2b_taxable)}
                          </div>
                          <div
                            className={`font-mono text-[11px] mt-0.5 ${
                              item.recon_status === 'missing_in_2b'
                                ? 'text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded inline-block'
                                : isItcDiff
                                ? 'text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded inline-block'
                                : 'text-slate-500'
                            }`}
                          >
                            ITC: {formatINR(item.gstr2b_itc)}
                          </div>
                        </td>

                        {/* Recon Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {item.recon_status === 'missing_in_2b' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Missing in 2B</span>
                            </span>
                          ) : item.recon_status === 'value_mismatch' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Value Mismatch</span>
                            </span>
                          ) : item.recon_status === 'missing_in_books' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Info className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Missing in Books</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Matched</span>
                            </span>
                          )}
                        </td>

                        {/* Discrepancy Note */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200/80 rounded-lg p-2 leading-relaxed">
                            {item.discrepancy_reason}
                          </div>
                        </td>

                        {/* AI Action */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          {explanation ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleRowExpand(item.id)}
                              className="text-xs h-8 gap-1.5 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-900 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              <span>{isExpanded ? 'Hide Finding' : '✨ View AI Finding'}</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => handleAnalyzeException(item.id, e)}
                              disabled={isAnalyzing}
                              className="text-xs h-8 gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              {isAnalyzing ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Analyzing...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>✨ Analyze with AI</span>
                                </>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded AI Explanation Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                          <td colSpan={8} className="p-4 sm:p-5">
                            {isAnalyzing ? (
                              /* Loading Skeleton */
                              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-5 shadow-xs">
                                <div className="flex items-center gap-2.5 text-purple-900 font-semibold text-xs mb-3">
                                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                                  <span>
                                    Gemini 1.5 Flash is analyzing exception data against Section 16(2)(aa) and vendor filing records...
                                  </span>
                                </div>
                                <div className="space-y-2.5 pt-1">
                                  <div className="h-3.5 bg-purple-200/70 rounded-md animate-pulse w-11/12" />
                                  <div className="h-3.5 bg-purple-200/50 rounded-md animate-pulse w-4/5" />
                                  <div className="h-3.5 bg-purple-200/40 rounded-md animate-pulse w-3/5" />
                                </div>
                              </div>
                            ) : explanation ? (
                              /* Styled AI Callout Box */
                              <div className="bg-gradient-to-br from-purple-50/90 via-indigo-50/40 to-white border border-purple-200/90 rounded-xl p-5 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-200/70">
                                  <div className="flex items-center gap-2.5">
                                    <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg shadow-2xs">
                                      <Sparkles className="w-4 h-4" />
                                    </span>
                                    <div>
                                      <h6 className="text-xs font-bold text-purple-950 flex items-center gap-2">
                                        Chartered Accountant Finding & Immediate Next Action
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                          Gemini 1.5 Flash Verified
                                        </span>
                                      </h6>
                                      <p className="text-[11px] text-purple-700/80 mt-0.5">
                                        Exception audit for Invoice #{item.invoice_number} ({item.supplier_gstin})
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => handleCopyExplanation(item.id, explanation, e)}
                                      className="text-xs h-7 gap-1 bg-white border-purple-200 text-purple-800 hover:bg-purple-50 hover:text-purple-900 cursor-pointer"
                                    >
                                      {copiedId === item.id ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-600" />
                                          <span className="text-emerald-700 font-semibold">Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 text-purple-600" />
                                          <span>Copy Action Note</span>
                                        </>
                                      )}
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => handleAnalyzeException(item.id, e)}
                                      disabled={isAnalyzing}
                                      className="text-xs h-7 gap-1 text-purple-700 hover:bg-purple-100 hover:text-purple-900 cursor-pointer"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Re-analyze</span>
                                    </Button>

                                    <Link
                                      href={`/dashboard/communications?vendor=${encodeURIComponent(item.supplier_gstin)}`}
                                      className="inline-flex items-center gap-1 text-xs h-7 px-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-2xs transition-colors"
                                    >
                                      <Mail className="w-3 h-3" />
                                      <span>Issue Notice</span>
                                    </Link>
                                  </div>
                                </div>

                                {/* Explanation Body */}
                                <div className="mt-3.5 text-xs text-slate-800 leading-relaxed font-normal bg-white/80 p-3.5 rounded-lg border border-purple-100 shadow-2xs">
                                  <p className="whitespace-pre-line text-slate-800 font-medium">
                                    {explanation}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              /* Ready to Analyze Prompt */
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700 mt-0.5">
                                    <Sparkles className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900 text-xs">
                                      AI Exception Analysis & Chartered Accountant Action Plan
                                    </div>
                                    <div className="text-slate-500 text-[11px] mt-0.5 max-w-xl">
                                      Let Gemini examine the verified monetary difference, determine vendor liability under Section 16(2)(aa), and generate an immediate audit recommendation for your firm.
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Link
                                    href={`/dashboard/communications?vendor=${encodeURIComponent(item.supplier_gstin)}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                                  >
                                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                                    <span>Issue Notice</span>
                                  </Link>
                                  <Button
                                    onClick={(e) => handleAnalyzeException(item.id, e)}
                                    disabled={isAnalyzing}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs h-8 px-3.5 shrink-0 gap-1.5 shadow-xs cursor-pointer"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>✨ Analyze with AI</span>
                                  </Button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h5 className="font-semibold text-slate-800 text-sm">No Exceptions Found</h5>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {searchQuery
                ? 'No discrepancies match your search query.'
                : 'All invoices match exactly within the ₹1 threshold for this period.'}
            </p>
          </div>
        )}

        {/* Footer / CA Audit Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Matched: {summary.matchedCount}</span>
            <span className="text-slate-300">&bull;</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Missing in 2B: {summary.missingIn2bCount}</span>
            <span className="text-slate-300">&bull;</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Value Mismatch: {summary.valueMismatchCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const textToCopy = `GST Reconciliation Summary - ${clientName} (${clientGstin})
Period: ${MONTHS.find((m) => m.value === selectedMonth)?.label} ${selectedYear}
Books ITC: ${formatINR(summary.booksTotalITC)}
GSTR-2B ITC: ${formatINR(summary.gstr2bTotalITC)}
Variance: ${formatINR(summary.itcDifference)}
Missing in 2B Invoices: ${summary.missingIn2bCount}
Value Mismatches: ${summary.valueMismatchCount}`;
                navigator.clipboard.writeText(textToCopy);
                alert('Reconciliation Summary copied to clipboard!');
              }}
              className="text-xs h-7 gap-1 border-slate-200 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Copy Audit Summary</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
