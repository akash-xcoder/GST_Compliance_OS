'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useClient } from '@/context/ClientContext';
import {
  DepartmentNotice,
  NoticeReply,
  getFallbackDepartmentNotices,
} from '@/lib/scrutiny/statutory-defense';
import {
  getDepartmentNoticesAction,
  getNoticeByIdAction,
  createDepartmentNoticeAction,
  updateNoticeStatusAction,
  submitNoticeReplyARNAction,
} from '@/app/dashboard/scrutiny/actions';
import { DefenseStudio } from '@/components/scrutiny/DefenseStudio';
import { formatINR } from '@/lib/notices/email-templates';
import {
  ShieldAlert,
  Scale,
  FileWarning,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  Plus,
  ArrowRight,
  Send,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  BadgeCheck,
  RefreshCw,
  X,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export default function ScrutinyDashboardPage() {
  const { currentClient, selectedClient, firmName } = useClient();
  const activeClient = currentClient || selectedClient || {
    id: 'c1',
    name: 'Acme Corp Industries',
    gstin: '29AAAAA0000A1Z5',
  };

  // State
  const [notices, setNotices] = useState<DepartmentNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [urgentOnly, setUrgentOnly] = useState(false);

  // Active Notice being edited in DefenseStudio
  const [activeNoticeId, setActiveNoticeId] = useState<string | null>(null);
  const [activeNotice, setActiveNotice] = useState<DepartmentNotice | null>(null);
  const [activeNoticeReply, setActiveNoticeReply] = useState<NoticeReply | undefined>(undefined);

  // New Notice Modal State
  const [showNewNoticeModal, setShowNewNoticeModal] = useState(false);
  const [newNoticeRef, setNewNoticeRef] = useState('');
  const [newNoticeType, setNewNoticeType] = useState<DepartmentNotice['notice_type']>('ASMT_10');
  const [newNoticeFY, setNewNoticeFY] = useState('2022-23');
  const [newNoticeIssueDate, setNewNoticeIssueDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newNoticeDueDate, setNewNoticeDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newNoticeTax, setNewNoticeTax] = useState<number>(100000);
  const [newNoticeInterest, setNewNoticeInterest] = useState<number>(36000);
  const [newNoticePenalty, setNewNoticePenalty] = useState<number>(10000);
  const [newNoticeCategory, setNewNoticeCategory] =
    useState<DepartmentNotice['allegation_category']>('ITC_2B_VS_3B');
  const [newNoticeDescription, setNewNoticeDescription] = useState(
    'Discrepancy observed between ITC claimed in GSTR-3B and credit available in GSTR-2B.'
  );
  const [isCreatingNotice, setIsCreatingNotice] = useState(false);

  // Quick ARN Modal State from ledger
  const [quickArnNotice, setQuickArnNotice] = useState<DepartmentNotice | null>(null);
  const [quickArnValue, setQuickArnValue] = useState('');
  const [isSubmittingQuickArn, setIsSubmittingQuickArn] = useState(false);

  // Load notices
  const loadNotices = useCallback(async () => {
    setIsLoading(true);
    const res = await getDepartmentNoticesAction(activeClient.id);
    if (res.success && res.data) {
      setNotices(res.data);
    } else {
      setNotices(getFallbackDepartmentNotices(activeClient.id));
    }
    setIsLoading(false);
  }, [activeClient.id]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  // Handle open defense studio
  const handleOpenStudio = async (notice: DepartmentNotice) => {
    setActiveNotice(notice);
    setActiveNoticeId(notice.id);

    const res = await getNoticeByIdAction(notice.id, activeClient.id);
    if (res.success && res.reply) {
      setActiveNoticeReply(res.reply);
    } else {
      setActiveNoticeReply(undefined);
    }
  };

  // Close defense studio & refresh
  const handleBackToLedger = () => {
    setActiveNoticeId(null);
    setActiveNotice(null);
    setActiveNoticeReply(undefined);
    loadNotices();
  };

  // Quick ARN submission from ledger row
  const handleQuickSubmitArn = async () => {
    if (!quickArnNotice || !quickArnValue.trim()) return;
    setIsSubmittingQuickArn(true);
    const res = await submitNoticeReplyARNAction({
      noticeId: quickArnNotice.id,
      clientId: activeClient.id,
      arn: quickArnValue.trim(),
    });
    setIsSubmittingQuickArn(false);
    if (res.success) {
      setQuickArnNotice(null);
      setQuickArnValue('');
      loadNotices();
    }
  };

  // Create new departmental notice
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeRef.trim()) return;

    setIsCreatingNotice(true);
    const res = await createDepartmentNoticeAction(activeClient.id, {
      notice_reference_no: newNoticeRef.trim(),
      notice_type: newNoticeType,
      financial_year: newNoticeFY,
      issue_date: newNoticeIssueDate,
      due_date: newNoticeDueDate,
      demand_tax: Number(newNoticeTax) || 0,
      demand_interest: Number(newNoticeInterest) || 0,
      demand_penalty: Number(newNoticePenalty) || 0,
      allegation_category: newNoticeCategory,
      allegation_description: newNoticeDescription,
      discrepancy_items: [
        {
          supplier_name: 'Procurement Discrepancy (Auto-Ingested)',
          supplier_gstin: '27AABCP9999Z1Z5',
          invoice_number: 'INV/22-23/001',
          invoice_date: newNoticeIssueDate,
          taxable_value: Math.round((Number(newNoticeTax) || 100000) / 0.18),
          claimed_3b_itc: Number(newNoticeTax) || 100000,
          reflected_2b_itc: 0,
          disputed_itc: Number(newNoticeTax) || 100000,
          nature_of_mismatch: 'Discrepancy between Table 4(A)(5) and Form GSTR-2B',
          status: 'Timing_Difference',
        },
      ],
    });

    setIsCreatingNotice(false);
    if (res.success) {
      setShowNewNoticeModal(false);
      setNewNoticeRef('');
      loadNotices();
    }
  };

  // Calculate days left helper
  const getDaysLeft = (dueDateStr: string) => {
    const due = new Date(dueDateStr).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  };

  // High-Impact Summary Metrics
  const metrics = useMemo(() => {
    let totalDemandTax = 0;
    let totalDemandTotal = 0;
    let criticalCount = 0;
    let submittedCount = 0;
    let activeCount = 0;

    notices.forEach((n) => {
      const days = getDaysLeft(n.due_date);
      totalDemandTax += n.demand_tax;
      totalDemandTotal += n.demand_tax + n.demand_interest + n.demand_penalty;

      if (n.status === 'Submitted_ASMT11' || n.status === 'Rectified') {
        submittedCount++;
      } else {
        activeCount++;
        if (days <= 7) {
          criticalCount++;
        }
      }
    });

    return {
      totalNotices: notices.length,
      activeCount,
      totalDemandTax,
      totalDemandTotal,
      criticalCount,
      submittedCount,
    };
  }, [notices]);

  // Filtered notices
  const filteredNotices = useMemo(() => {
    return notices.filter((notice) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = notice.notice_reference_no.toLowerCase().includes(q);
        const matchesType = notice.notice_type.toLowerCase().includes(q);
        const matchesDesc = (notice.allegation_description || '').toLowerCase().includes(q);
        const matchesSupplier = notice.discrepancy_items?.some((i) =>
          i.supplier_name.toLowerCase().includes(q) || i.supplier_gstin.toLowerCase().includes(q)
        );
        if (!matchesRef && !matchesType && !matchesDesc && !matchesSupplier) return false;
      }

      // Category
      if (selectedCategory !== 'all' && notice.allegation_category !== selectedCategory) {
        return false;
      }

      // Type
      if (selectedType !== 'all' && notice.notice_type !== selectedType) {
        return false;
      }

      // Status
      if (selectedStatus !== 'all' && notice.status !== selectedStatus) {
        return false;
      }

      // Urgent only (< 7 days)
      if (urgentOnly) {
        const days = getDaysLeft(notice.due_date);
        if (days > 7 || notice.status === 'Submitted_ASMT11' || notice.status === 'Rectified') {
          return false;
        }
      }

      return true;
    });
  }, [notices, searchQuery, selectedCategory, selectedType, selectedStatus, urgentOnly]);

  // If in active DefenseStudio mode, render it
  if (activeNotice) {
    return (
      <div className="max-w-7xl mx-auto pb-12">
        <DefenseStudio
          notice={activeNotice}
          existingReply={activeNoticeReply}
          client={{
            id: activeClient.id,
            name: activeClient.name,
            gstin: activeClient.gstin,
            tradeName: (activeClient as any).trade_name,
            address: (activeClient as any).address || 'Maharashtra Registered Office',
          }}
          caFirmName={firmName || 'Kapur & Associates, Chartered Accountants'}
          onBack={handleBackToLedger}
          onRefreshNotice={loadNotices}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Departmental Scrutiny & Notice Defense Studio
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory replies in Form GST ASMT-11, DRC-01 defense & Section 50 interest verification
              </p>
            </div>
          </div>
        </div>

        {/* Client & Action Bar */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">{activeClient.name}</span>
            <span className="font-mono text-slate-400">({activeClient.gstin})</span>
          </div>

          <button
            onClick={() => setShowNewNoticeModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Ingest New Notice</span>
          </button>
        </div>
      </div>

      {/* High-Impact Summary Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Notices */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Active Scrutiny Cases</span>
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.activeCount}</span>
            <span className="text-xs text-slate-500">/ {metrics.totalNotices} total</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600">Pending ASMT-11 or DRC-06</div>
        </div>

        {/* Total Disputed Tax Exposure */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Demand at Risk</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{formatINR(metrics.totalDemandTotal)}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            Principal Tax: <span className="font-medium">{formatINR(metrics.totalDemandTax)}</span>
          </div>
        </div>

        {/* Critical Notices (< 7 days) */}
        <div
          onClick={() => setUrgentOnly(!urgentOnly)}
          className={`border rounded-xl p-4 shadow-sm cursor-pointer transition-all ${
            metrics.criticalCount > 0
              ? 'bg-red-50/40 border-red-200 hover:bg-red-50/70'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
            <span className={metrics.criticalCount > 0 ? 'text-red-800' : 'text-slate-500'}>
              Critical (&lt; 7 Days)
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${metrics.criticalCount > 0 ? 'text-red-600 animate-bounce' : 'text-slate-400'}`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                metrics.criticalCount > 0 ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {metrics.criticalCount}
            </span>
            <span className="text-xs text-red-600 font-medium">Action Required</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            {urgentOnly ? 'Showing urgent cases only (click to clear)' : 'Filter urgent deadlines'}
          </div>
        </div>

        {/* Replies Dispatched / Submitted */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Replies Submitted</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{metrics.submittedCount}</span>
            <span className="text-xs text-slate-500">with official ARN</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600">Form GST ASMT-11 lodged</div>
        </div>
      </div>

      {/* Case Ledger Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by notice ref, type, supplier, or allegation..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Notice Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Notice Forms</option>
              <option value="ASMT_10">Form GST ASMT-10</option>
              <option value="DRC_01A">Form GST DRC-01A</option>
              <option value="DRC_01">Form GST DRC-01</option>
              <option value="REG_17">Form GST REG-17</option>
            </select>

            {/* Allegation Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Allegation Categories</option>
              <option value="ITC_2B_VS_3B">ITC: GSTR-2B vs 3B</option>
              <option value="GSTR_1_VS_3B">Tax: GSTR-1 vs 3B</option>
              <option value="CANCELLED_SUPPLIER">Cancelled Supplier</option>
              <option value="EWAY_BILL_MISMATCH">E-Way Bill Mismatch</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Stages</option>
              <option value="Under Review">Under Review</option>
              <option value="Drafting Reply">Drafting Reply</option>
              <option value="Partner Approved">Partner Approved</option>
              <option value="Submitted_ASMT11">Submitted ASMT-11</option>
              <option value="Order Passed">Order Passed</option>
              <option value="Rectified">Rectified</option>
            </select>

            {/* Refresh */}
            <button
              onClick={loadNotices}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrutiny Case Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Departmental Scrutiny Notices Ledger ({filteredNotices.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">CGST Section 61 & Section 73/74 Scrutiny</span>
        </div>

        {filteredNotices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Departmental Notices Match Filter</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No scrutiny notices found matching the criteria. Click "Ingest New Notice" to record a statutory notice received from the GST authority.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedType('all');
                setSelectedStatus('all');
                setUrgentOnly(false);
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Notice Reference & Type</th>
                  <th className="p-3.5">Allegation & FY</th>
                  <th className="p-3.5 text-right">Demand Breakdown</th>
                  <th className="p-3.5">Statutory Due Date</th>
                  <th className="p-3.5">Stage / Workflow</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotices.map((notice) => {
                  const days = getDaysLeft(notice.due_date);
                  const isSubmitted =
                    notice.status === 'Submitted_ASMT11' || notice.status === 'Rectified';

                  return (
                    <tr
                      key={notice.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenStudio(notice)}
                    >
                      {/* Notice Ref & Type */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10.5px] bg-slate-100 text-slate-800 border border-slate-200">
                            {notice.notice_type}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors font-mono">
                            {notice.notice_reference_no}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Issued: {notice.issue_date} • {notice.issuing_authority || 'Superintendent Range-IV'}
                        </div>
                      </td>

                      {/* Allegation Category & FY */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {notice.allegation_category.replace(/_/g, ' ')}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                            FY {notice.financial_year}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 line-clamp-1 max-w-xs">
                          {notice.allegation_description}
                        </div>
                      </td>

                      {/* Demand Breakdown */}
                      <td className="p-3.5 text-right">
                        <div className="font-bold text-slate-900 font-mono">
                          {formatINR(notice.demand_tax + notice.demand_interest + notice.demand_penalty)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Tax: {formatINR(notice.demand_tax)} | Int: {formatINR(notice.demand_interest)}
                        </div>
                      </td>

                      {/* Due Date & Urgency Countdown */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{notice.due_date}</span>
                        </div>
                        <div className="mt-1">
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Reply Dispatched
                            </span>
                          ) : days < 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              Overdue by {Math.abs(days)}d
                            </span>
                          ) : days <= 7 ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-700" />
                              {days} days left!
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">
                              {days} days remaining
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Stage */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            notice.status === 'Submitted_ASMT11'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : notice.status === 'Partner Approved'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : notice.status === 'Drafting Reply'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {notice.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenStudio(notice)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-indigo-200"
                          >
                            <span>Draft ASMT-11</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {!isSubmitted && (
                            <button
                              onClick={() => setQuickArnNotice(notice)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                              title="Log Portal Submission ARN"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* MODAL: Ingest New Notice */}
      {showNewNoticeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ingest Departmental Notice</h3>
                  <p className="text-xs text-slate-500">Record ASMT-10, DRC-01A, or DRC-01 scrutiny case</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewNoticeModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notice Reference No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={newNoticeRef}
                    onChange={(e) => setNewNoticeRef(e.target.value)}
                    placeholder="e.g. ZA270923019842F"
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Form *</label>
                  <select
                    value={newNoticeType}
                    onChange={(e) => setNewNoticeType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="ASMT_10">Form GST ASMT-10 (Section 61 Scrutiny)</option>
                    <option value="DRC_01A">Form GST DRC-01A (Pre-SCN Intimation)</option>
                    <option value="DRC_01">Form GST DRC-01 (Show Cause Notice)</option>
                    <option value="REG_17">Form GST REG-17 (Cancellation Show Cause)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Financial Year</label>
                  <select
                    value={newNoticeFY}
                    onChange={(e) => setNewNoticeFY(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="2023-24">FY 2023-24</option>
                    <option value="2022-23">FY 2022-23</option>
                    <option value="2021-22">FY 2021-22</option>
                    <option value="2020-21">FY 2020-21</option>
                    <option value="2019-20">FY 2019-20</option>
                    <option value="2018-19">FY 2018-19</option>
                    <option value="2017-18">FY 2017-18</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={newNoticeIssueDate}
                    onChange={(e) => setNewNoticeIssueDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newNoticeDueDate}
                    onChange={(e) => setNewNoticeDueDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Allegation Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allegation Category
                </label>
                <select
                  value={newNoticeCategory}
                  onChange={(e) => setNewNoticeCategory(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                >
                  <option value="ITC_2B_VS_3B">ITC_2B_VS_3B - GSTR-2B vs 3B ITC Excess</option>
                  <option value="GSTR_1_VS_3B">GSTR_1_VS_3B - Outward Supply Shortfall</option>
                  <option value="CANCELLED_SUPPLIER">CANCELLED_SUPPLIER - Ineligible ITC from Cancelled Vendor</option>
                  <option value="EWAY_BILL_MISMATCH">EWAY_BILL_MISMATCH - E-Way Bill vs GSTR-1 Mismatch</option>
                </select>
              </div>

              {/* Demands */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Tax Demand (₹)</label>
                  <input
                    type="number"
                    value={newNoticeTax}
                    onChange={(e) => setNewNoticeTax(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Interest (₹)</label>
                  <input
                    type="number"
                    value={newNoticeInterest}
                    onChange={(e) => setNewNoticeInterest(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Penalty (₹)</label>
                  <input
                    type="number"
                    value={newNoticePenalty}
                    onChange={(e) => setNewNoticePenalty(Number(e.target.value) || 0)}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allegation Summary / Officer Notes
                </label>
                <textarea
                  rows={2}
                  value={newNoticeDescription}
                  onChange={(e) => setNewNoticeDescription(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none"
                  placeholder="Details of discrepancies intimated in Form ASMT-10..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewNoticeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingNotice || !newNoticeRef.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isCreatingNotice ? 'Ingesting Notice...' : 'Save Scrutiny Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MODAL: Log ARN from table row */}
      {quickArnNotice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Form GST ASMT-11 ARN</h3>
                <p className="text-xs text-slate-500">{quickArnNotice.notice_reference_no}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GST Portal Acknowledgement ARN *
                </label>
                <input
                  type="text"
                  value={quickArnValue}
                  onChange={(e) => setQuickArnValue(e.target.value)}
                  placeholder="e.g. AA271023019842M"
                  className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
                />
              </div>

              <p className="text-xs text-slate-500">
                This marks the statutory defense for {quickArnNotice.notice_reference_no} as{' '}
                <strong>Submitted_ASMT11</strong> in the compliance register.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickArnNotice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickSubmitArn}
                disabled={!quickArnValue.trim() || isSubmittingQuickArn}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmittingQuickArn ? 'Saving...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
