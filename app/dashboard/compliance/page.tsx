'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useClient } from '@/context/ClientContext';
import {
  StatutoryFilingRecord,
  FilingStatus,
  ReturnType,
  TaxScheme,
  calculateEstimatedLateFee,
} from '@/lib/utils/gstDeadlines';
import {
  getFirmComplianceRecordsAction,
  updateFilingStatusAction,
  generateFilingsForNewPeriodAction,
} from '@/app/dashboard/compliance/actions';
import {
  CalendarClock,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Upload,
  Building2,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  FileCheck,
  ShieldAlert,
  ArrowUpRight,
  BadgeCheck,
  Layers,
  Sparkles,
  DollarSign,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ComplianceTrackerPage() {
  const router = useRouter();
  const { clients, selectedFirmId, firmName, setCurrentClient } = useClient();

  // Selected period state
  const [selectedPeriod, setSelectedPeriod] = useState('August 2026');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScheme, setSelectedScheme] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedReturnFilter, setSelectedReturnFilter] = useState<string>('all');

  // Data states
  const [filings, setFilings] = useState<StatutoryFilingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Action Modal (Update status / Log ARN)
  const [editingFiling, setEditingFiling] = useState<StatutoryFilingRecord | null>(null);
  const [modalStatus, setModalStatus] = useState<FilingStatus>('Filed');
  const [modalArn, setModalArn] = useState('');
  const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalNotes, setModalNotes] = useState('');
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  // Calendar Slide-out Drawer state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>('2026-09-11');
  const [calendarMonth, setCalendarMonth] = useState(8); // 0-indexed: 8 = September 2026 (due dates for Aug)
  const [calendarYear, setCalendarYear] = useState(2026);

  // Load compliance records
  const loadFilings = useCallback(async () => {
    setIsLoading(true);
    const clientList = clients.map((c) => ({
      id: c.id,
      name: c.name,
      gstin: c.gstin,
      trade_name: c.trade_name,
    }));
    const res = await getFirmComplianceRecordsAction(selectedFirmId || 'default-firm', clientList);
    if (res.success && res.data) {
      setFilings(res.data);
    }
    setIsLoading(false);
  }, [clients, selectedFirmId]);

  useEffect(() => {
    loadFilings();
  }, [loadFilings]);

  // Navigate to client workspace
  const handleGoToClientWorkspace = (clientId: string, destination: 'recon' | 'upload') => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setCurrentClient(client);
    }
    if (destination === 'recon') {
      router.push('/dashboard/reconciliation');
    } else {
      router.push('/dashboard/documents');
    }
  };

  // Open status modal
  const handleOpenStatusModal = (filing: StatutoryFilingRecord) => {
    setEditingFiling(filing);
    setModalStatus(filing.filing_status === 'Not Started' ? 'Data Preparation' : filing.filing_status);
    setModalArn(filing.arn_number || '');
    setModalDate(filing.date_of_filing || new Date().toISOString().split('T')[0]);
    setModalNotes(filing.notes || '');
  };

  // Save status modal
  const handleSaveStatusModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFiling) return;
    setIsSubmittingModal(true);

    const res = await updateFilingStatusAction({
      firmId: selectedFirmId || 'default-firm',
      filingId: editingFiling.id,
      status: modalStatus,
      arnNumber: modalStatus === 'Filed' ? modalArn : null,
      dateOfFiling: modalStatus === 'Filed' ? modalDate : null,
      notes: modalNotes,
    });

    setIsSubmittingModal(false);
    if (res.success) {
      setEditingFiling(null);
      loadFilings();
    }
  };

  // Urgent Action Center Computations
  const urgentSummary = useMemo(() => {
    const overdueItems: StatutoryFilingRecord[] = [];
    const urgentItems: StatutoryFilingRecord[] = []; // Due in <= 3 days
    let totalLateFees = 0;
    let filedCount = 0;
    let totalCurrentPeriod = 0;

    filings.forEach((f) => {
      if (f.filing_period === selectedPeriod) {
        totalCurrentPeriod++;
        if (f.filing_status === 'Filed') {
          filedCount++;
        }
      }

      if (f.filing_status === 'Overdue') {
        overdueItems.push(f);
        totalLateFees += f.estimated_late_fee || 0;
      } else if (f.filing_status !== 'Filed') {
        if (f.days_remaining <= 3 && f.days_remaining >= 0) {
          urgentItems.push(f);
        }
      }
    });

    const completionRate =
      totalCurrentPeriod > 0 ? Math.round((filedCount / totalCurrentPeriod) * 100) : 0;

    return {
      overdueItems,
      urgentItems,
      totalLateFees,
      filedCount,
      totalCurrentPeriod,
      completionRate,
    };
  }, [filings, selectedPeriod]);

  // Master Portfolio Table Data (Client row grouping)
  const clientPortfolioRows = useMemo(() => {
    return clients.map((client) => {
      const clientFilings = filings.filter((f) => f.client_id === client.id);
      const currentPeriodFilings = clientFilings.filter((f) => f.filing_period === selectedPeriod);

      const gstr1 = currentPeriodFilings.find((f) => f.return_type === 'GSTR_1');
      const gstr3b = currentPeriodFilings.find((f) => f.return_type === 'GSTR_3B');

      // Check overdue across all periods
      const hasOverdue = clientFilings.some((f) => f.filing_status === 'Overdue');
      const allFiled =
        currentPeriodFilings.length > 0 &&
        currentPeriodFilings.every((f) => f.filing_status === 'Filed');

      let healthStatus: 'Optimal' | 'Action_Needed' | 'Critical_Overdue' = 'Action_Needed';
      if (hasOverdue) {
        healthStatus = 'Critical_Overdue';
      } else if (allFiled) {
        healthStatus = 'Optimal';
      }

      // Late fee total
      const totalLateFee = clientFilings.reduce(
        (acc, curr) => acc + (curr.estimated_late_fee || 0),
        0
      );

      // Determine scheme
      const taxScheme: TaxScheme = (gstr1?.tax_scheme || 'Regular') as TaxScheme;

      return {
        client,
        taxScheme,
        gstr1,
        gstr3b,
        allClientFilings: clientFilings,
        healthStatus,
        totalLateFee,
      };
    });
  }, [clients, filings, selectedPeriod]);

  // Filtered Client Portfolio Rows
  const filteredClientRows = useMemo(() => {
    return clientPortfolioRows.filter((row) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.client.name.toLowerCase().includes(q);
        const matchesGstin = row.client.gstin.toLowerCase().includes(q);
        const matchesTrade = (row.client.trade_name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesGstin && !matchesTrade) return false;
      }

      // Scheme
      if (selectedScheme !== 'all' && row.taxScheme !== selectedScheme) {
        return false;
      }

      // Status
      if (selectedStatusFilter === 'overdue') {
        if (row.healthStatus !== 'Critical_Overdue') return false;
      } else if (selectedStatusFilter === 'filed') {
        if (row.healthStatus !== 'Optimal') return false;
      } else if (selectedStatusFilter === 'pending') {
        if (row.healthStatus !== 'Action_Needed') return false;
      }

      return true;
    });
  }, [clientPortfolioRows, searchQuery, selectedScheme, selectedStatusFilter]);

  // Calendar Day Map: Map date string YYYY-MM-DD -> list of filings due on that day
  const calendarDueMap = useMemo(() => {
    const map = new Map<string, StatutoryFilingRecord[]>();
    filings.forEach((f) => {
      const list = map.get(f.due_date) || [];
      list.push(f);
      map.set(f.due_date, list);
    });
    return map;
  }, [filings]);

  // Calendar Dates Generator for September 2026 (or selected calendar month)
  const calendarGrid = useMemo(() => {
    const year = calendarYear;
    const month = calendarMonth; // 8 = September
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dateNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      filingsDue: StatutoryFilingRecord[];
    }> = [];

    // Pre-pad with previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateNumber: dNum,
        dateString: dateStr,
        isCurrentMonth: false,
        filingsDue: calendarDueMap.get(dateStr) || [],
      });
    }

    // Days in active month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateNumber: d,
        dateString: dateStr,
        isCurrentMonth: true,
        filingsDue: calendarDueMap.get(dateStr) || [],
      });
    }

    // Post-pad to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = month + 2 > 12 ? 1 : month + 2;
      const nextY = month + 2 > 12 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateNumber: i,
        dateString: dateStr,
        isCurrentMonth: false,
        filingsDue: calendarDueMap.get(dateStr) || [],
      });
    }

    return days;
  }, [calendarMonth, calendarYear, calendarDueMap]);

  // Selected date's filings for slide-out drawer
  const selectedDateFilings = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return calendarDueMap.get(selectedCalendarDate) || [];
  }, [selectedCalendarDate, calendarDueMap]);

  // Status Badge Component Helper
  const renderStatusBadge = (status?: FilingStatus, daysRemaining?: number, lateFee?: number) => {
    if (!status) {
      return (
        <span className="px-2 py-0.5 rounded text-[10.5px] bg-slate-100 text-slate-400 font-medium">
          Not Scheduled
        </span>
      );
    }

    switch (status) {
      case 'Filed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Filed</span>
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Overdue {lateFee ? `(${formatCurrency(lateFee)})` : ''}</span>
          </span>
        );
      case 'Pending Client Approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Client Approval</span>
          </span>
        );
      case 'Data Preparation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Layers className="w-3 h-3 text-indigo-500" />
            <span>Data Prep</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span>Not Started</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* 1. Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Multi-Client Compliance Tracker & Statutory Due-Date Calendar
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized statutory filing ledger across GSTR-1, GSTR-3B & QRMP schemes with Section 47 late-fee monitor
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector & View Mode Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
            <CalendarIcon className="w-3.5 h-3.5 text-slate-500 ml-2" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-slate-700 font-semibold px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="August 2026">August 2026 (Due Sept 2026)</option>
              <option value="July 2026">July 2026 (Due Aug 2026)</option>
              <option value="June 2026">June 2026 (Due July 2026)</option>
              <option value="September 2026">September 2026 (Due Oct 2026)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Portfolio Table</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Statutory Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Urgent Action Center & Top Warning Panel */}
      <div className="space-y-4">
        {/* If overdue returns exist, show immediate prominent warning banner with late fees */}
        {urgentSummary.overdueItems.length > 0 && (
          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-900 text-sm">
                    Urgent Action Required: {urgentSummary.overdueItems.length} Statutory Return
                    {urgentSummary.overdueItems.length > 1 ? 's' : ''} Overdue
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-200 text-rose-900">
                    Section 47 Accruing
                  </span>
                </div>
                <p className="text-xs text-rose-700 mt-1 max-w-2xl leading-relaxed">
                  Tax returns have crossed statutory due dates. Cumulative estimated late fees of{' '}
                  <strong className="font-bold text-rose-950 font-mono">
                    {formatCurrency(urgentSummary.totalLateFees)}
                  </strong>{' '}
                  have accrued at ₹50/day across clients. Resolve reconciliation and obtain client OTP immediately.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setSelectedStatusFilter('overdue');
                  setViewMode('table');
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <span>Filter Overdue Clients</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* High-Impact Portfolio Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Clients */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Onboarded Clients</span>
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{clients.length}</span>
              <span className="text-xs text-slate-500">Active Entities</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-600">
              {clients.filter((c) => c.status === 'active').length} Regular &amp; QRMP filers
            </div>
          </div>

          {/* Period Completion Rate */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Filing Progress</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {urgentSummary.completionRate}%
              </span>
              <span className="text-xs text-slate-500">
                ({urgentSummary.filedCount} / {urgentSummary.totalCurrentPeriod} filed)
              </span>
            </div>
            <div className="mt-1.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${urgentSummary.completionRate}%` }}
              />
            </div>
          </div>

          {/* Overdue Count */}
          <div
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'overdue' ? 'all' : 'overdue')}
            className={`border rounded-xl p-4 shadow-xs cursor-pointer transition-all ${
              urgentSummary.overdueItems.length > 0
                ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/70'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
              <span className={urgentSummary.overdueItems.length > 0 ? 'text-rose-800' : 'text-slate-500'}>
                Overdue Filings
              </span>
              <ShieldAlert
                className={`w-4 h-4 ${
                  urgentSummary.overdueItems.length > 0 ? 'text-rose-600' : 'text-slate-400'
                }`}
              />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-black ${
                  urgentSummary.overdueItems.length > 0 ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                {urgentSummary.overdueItems.length}
              </span>
              <span className="text-xs text-rose-600 font-medium">Immediate Action</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-600">
              Late Fee Accrued: <strong className="font-mono">{formatCurrency(urgentSummary.totalLateFees)}</strong>
            </div>
          </div>

          {/* Filings Due in <= 3 Days */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Next 3 Days Deadlines</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{urgentSummary.urgentItems.length}</span>
              <span className="text-xs text-amber-700 font-medium">Pending Submission</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-600">
              Upcoming 11th / 13th / 20th statutory dates
            </div>
          </div>
        </div>
      </div>

      {/* 3. Global Portfolio Table View */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          {/* Table Search & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by client name, trade name, or GSTIN..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Scheme Filter */}
              <select
                value={selectedScheme}
                onChange={(e) => setSelectedScheme(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">All Tax Schemes</option>
                <option value="Regular">Regular (Monthly)</option>
                <option value="QRMP">QRMP (Quarterly)</option>
                <option value="Composition">Composition</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">All Health Stages</option>
                <option value="filed">Optimal (All Filed)</option>
                <option value="pending">Action Needed (In Progress)</option>
                <option value="overdue">Critical (Overdue)</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={loadFilings}
                disabled={isLoading}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                title="Refresh filings"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Master Client Compliance Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Client Compliance Portfolio ({filteredClientRows.length} Clients)
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Period: <strong className="text-slate-700 font-medium">{selectedPeriod}</strong>
              </span>
            </div>

            {filteredClientRows.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Clients Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No clients match the active search and filter criteria. Reset filters to view all onboarded entities.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedScheme('all');
                    setSelectedStatusFilter('all');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Client &amp; GSTIN</th>
                      <th className="p-3.5">Tax Scheme</th>
                      <th className="p-3.5">GSTR-1 Status ({selectedPeriod})</th>
                      <th className="p-3.5">GSTR-3B Status ({selectedPeriod})</th>
                      <th className="p-3.5">Compliance Health</th>
                      <th className="p-3.5 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClientRows.map((row) => {
                      const { client, taxScheme, gstr1, gstr3b, healthStatus, totalLateFee } = row;

                      return (
                        <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Client Information */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 text-xs hover:text-indigo-600 transition-colors cursor-pointer"
                              onClick={() => handleGoToClientWorkspace(client.id, 'recon')}
                            >
                              {client.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-mono">
                              <span>{client.gstin}</span>
                              {client.trade_name && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-sans text-slate-400 truncate max-w-[140px]">
                                    {client.trade_name}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Tax Scheme */}
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold ${
                                taxScheme === 'QRMP'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {taxScheme === 'QRMP' ? 'QRMP Quarterly' : 'Regular Monthly'}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1">
                              State: {gstr1?.state_name || 'Maharashtra'}
                            </div>
                          </td>

                          {/* GSTR-1 Status */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              {renderStatusBadge(
                                gstr1?.filing_status,
                                gstr1?.days_remaining,
                                gstr1?.estimated_late_fee
                              )}
                              {gstr1 && (
                                <button
                                  onClick={() => handleOpenStatusModal(gstr1)}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                                >
                                  Update
                                </button>
                              )}
                            </div>
                            {gstr1 && (
                              <div className="text-[10.5px] text-slate-500 mt-1">
                                Due: {gstr1.due_date}{' '}
                                {gstr1.arn_number && (
                                  <span className="font-mono text-[10px] text-emerald-700 ml-1">
                                    ARN: {gstr1.arn_number.slice(0, 8)}...
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* GSTR-3B Status */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              {renderStatusBadge(
                                gstr3b?.filing_status,
                                gstr3b?.days_remaining,
                                gstr3b?.estimated_late_fee
                              )}
                              {gstr3b && (
                                <button
                                  onClick={() => handleOpenStatusModal(gstr3b)}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                                >
                                  Update
                                </button>
                              )}
                            </div>
                            {gstr3b && (
                              <div className="text-[10.5px] text-slate-500 mt-1">
                                Due: {gstr3b.due_date}
                                {gstr3b.filing_status === 'Overdue' && (
                                  <span className="text-rose-600 font-bold ml-1">
                                    ({gstr3b.days_overdue}d overdue)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Compliance Health */}
                          <td className="p-3.5">
                            {healthStatus === 'Critical_Overdue' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  Critical Overdue
                                </span>
                                {totalLateFee > 0 && (
                                  <div className="text-[10px] text-rose-600 font-mono mt-0.5">
                                    Fee: {formatCurrency(totalLateFee)}
                                  </div>
                                )}
                              </div>
                            ) : healthStatus === 'Optimal' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <BadgeCheck className="w-3.5 h-3.5" />
                                100% Up to Date
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Filing in Progress
                              </span>
                            )}
                          </td>

                          {/* Quick Actions (Directly routes to Recon or Upload) */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-Click to Reconciliation */}
                              <button
                                onClick={() => handleGoToClientWorkspace(client.id, 'recon')}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-indigo-200"
                                title="Open GST Reconciliation Engine for this client"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Reconciliation</span>
                              </button>

                              {/* 1-Click to Document Upload */}
                              <button
                                onClick={() => handleGoToClientWorkspace(client.id, 'upload')}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                                title="Upload GSTR-2B or Purchase Register for this client"
                              >
                                <Upload className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Interactive Due-Date Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            {/* Calendar Header with Month Navigation */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {new Date(calendarYear, calendarMonth).toLocaleString('default', {
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    Statutory Due Dates
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Statutory compliance calendar for August 2026 tax returns
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear((y) => y - 1);
                    } else {
                      setCalendarMonth((m) => m - 1);
                    }
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCalendarMonth(8); // September 2026
                    setCalendarYear(2026);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Current Period
                </button>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear((y) => y + 1);
                    } else {
                      setCalendarMonth((m) => m + 1);
                    }
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Statutory Key Rules Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800">Statutory Timelines:</span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <strong>11th:</strong> GSTR-1 Monthly
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <strong>13th:</strong> GSTR-1 QRMP/IFF
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <strong>20th:</strong> GSTR-3B Monthly
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <strong>22nd/24th:</strong> GSTR-3B QRMP
              </span>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-400 border-b border-slate-100 pb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarGrid.map((day, idx) => {
                const isSelected = selectedCalendarDate === day.dateString;
                const filingsCount = day.filingsDue.length;
                const hasOverdue = day.filingsDue.some((f) => f.filing_status === 'Overdue');
                const hasPending = day.filingsDue.some((f) => f.filing_status !== 'Filed');

                // Major statutory date badge check
                const is11th = day.dateNumber === 11 && day.isCurrentMonth;
                const is13th = day.dateNumber === 13 && day.isCurrentMonth;
                const is20th = day.dateNumber === 20 && day.isCurrentMonth;
                const is22nd = day.dateNumber === 22 && day.isCurrentMonth;
                const is24th = day.dateNumber === 24 && day.isCurrentMonth;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCalendarDate(day.dateString)}
                    className={`min-h-[85px] p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40'
                        : day.isCurrentMonth
                        ? 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70 bg-white'
                        : 'border-slate-100 bg-slate-50/40 opacity-40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isSelected
                            ? 'text-indigo-700'
                            : day.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {day.dateNumber}
                      </span>

                      {/* Statutory milestone pill */}
                      {is11th && (
                        <span className="text-[9px] font-bold px-1 rounded bg-blue-100 text-blue-800">
                          G1
                        </span>
                      )}
                      {is13th && (
                        <span className="text-[9px] font-bold px-1 rounded bg-purple-100 text-purple-800">
                          IFF
                        </span>
                      )}
                      {is20th && (
                        <span className="text-[9px] font-bold px-1 rounded bg-indigo-100 text-indigo-800">
                          3B
                        </span>
                      )}
                      {(is22nd || is24th) && (
                        <span className="text-[9px] font-bold px-1 rounded bg-amber-100 text-amber-800">
                          QRMP
                        </span>
                      )}
                    </div>

                    {/* Due Filings Badges */}
                    {filingsCount > 0 ? (
                      <div className="mt-1 space-y-1">
                        <div
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center justify-between ${
                            hasOverdue
                              ? 'bg-rose-100 text-rose-800 font-bold'
                              : hasPending
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <span>{filingsCount} Due</span>
                          {hasOverdue ? (
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-300">-</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slide-out / Side Panel for Selected Date */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Filings Due: {selectedCalendarDate || 'Select a Date'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedDateFilings.length} return
                    {selectedDateFilings.length === 1 ? '' : 's'} scheduled for this date
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-50 text-indigo-700">
                  {selectedDateFilings.length} items
                </span>
              </div>

              {/* List of Clients with filings due */}
              <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {selectedDateFilings.length === 0 ? (
                  <div className="p-8 text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
                    <CalendarClock className="w-8 h-8 text-slate-300 mx-auto" />
                    <div className="text-xs font-semibold text-slate-700">
                      No statutory filings scheduled
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Select a date with a colored badge (e.g. 11th, 13th, 20th, 22nd) to inspect filings.
                    </p>
                  </div>
                ) : (
                  selectedDateFilings.map((filing) => (
                    <div
                      key={filing.id}
                      className="border border-slate-200 rounded-xl p-3.5 hover:border-indigo-300 hover:bg-slate-50/50 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            {filing.client_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {filing.client_gstin} • {filing.state_name}
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10.5px] bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                          {filing.return_type}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <div>{renderStatusBadge(filing.filing_status, filing.days_remaining, filing.estimated_late_fee)}</div>

                        <button
                          onClick={() => handleOpenStatusModal(filing)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                        >
                          Update Status
                        </button>
                      </div>

                      {/* Direct Workspace Action */}
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                        <button
                          onClick={() => handleGoToClientWorkspace(filing.client_id, 'recon')}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors flex items-center gap-1"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>Go to Recon</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
              Tip: Click any client's "Go to Recon" to open their reconciliation dashboard with automated GSTR-2B vs 3B calculations.
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: Update Filing Status & Log ARN */}
      {editingFiling && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Update Statutory Filing Status
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingFiling.client_name} • {editingFiling.return_type} ({editingFiling.filing_period})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingFiling(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStatusModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Filing Status Stage *
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as FilingStatus)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="Data Preparation">Data Preparation (Recon Active)</option>
                  <option value="Pending Client Approval">Pending Client Approval (OTP/DSC)</option>
                  <option value="Filed">Filed on GST Portal</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              {/* If Marked as Filed, prompt for ARN and Date */}
              {modalStatus === 'Filed' && (
                <div className="space-y-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-900 mb-1">
                      GST Portal Acknowledgement Reference Number (ARN) *
                    </label>
                    <input
                      type="text"
                      required
                      value={modalArn}
                      onChange={(e) => setModalArn(e.target.value)}
                      placeholder="e.g. AA270926019842M"
                      className="w-full text-xs font-mono uppercase px-3 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-emerald-900 mb-1">
                      Date of Filing *
                    </label>
                    <input
                      type="date"
                      required
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-emerald-300 rounded-lg focus:outline-none bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Audit &amp; CA Notes
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g. 2B recon completed. Minor ₹42 round-off difference accepted."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFiling(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal || (modalStatus === 'Filed' && !modalArn.trim())}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmittingModal ? 'Saving...' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
