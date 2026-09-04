'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useClient } from '@/context/ClientContext';
import {
  getVendorDiscrepancies,
  getVendorCommunications,
  saveVendorCommunication,
  updateCommunicationStatus,
  sendVendorCommunication,
  VendorDiscrepancySummary,
  VendorCommunicationRecord,
} from '@/app/dashboard/communications/actions';
import {
  DiscrepancyInvoice,
  formatINR,
  generateAdvisoryEmail,
  generateUrgentReminderEmail,
  generateSettlementDemandEmail,
  GeneratedEmailDraft,
} from '@/lib/notices/email-templates';
import { generateFormalLegalNotice, LegalNoticeDocument } from '@/lib/notices/legal-notices';
import {
  Mail,
  FileWarning,
  Send,
  Printer,
  Copy,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Building2,
  FileText,
  Scale,
  RefreshCw,
  X,
  Calendar,
  DollarSign,
  UserCheck,
  Check,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VendorCommunicationDashboardProps {
  initialSupplierGstin?: string;
  onNavigateToRecon?: () => void;
}

export function VendorCommunicationDashboard({
  initialSupplierGstin,
  onNavigateToRecon,
}: VendorCommunicationDashboardProps) {
  const { currentClient, selectedClientId, firmName } = useClient();
  const activeClientId = currentClient?.id || selectedClientId || '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca';
  const clientName = currentClient?.name || 'Acme Manufacturing Ltd.';
  const clientGstin = currentClient?.gstin || '27AAAAA0000A1Z5';

  const [activeTab, setActiveTab] = useState<'discrepancies' | 'history' | 'statutory'>('discrepancies');
  const [discrepancies, setDiscrepancies] = useState<VendorDiscrepancySummary[]>([]);
  const [communications, setCommunications] = useState<VendorCommunicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'action_needed' | 'notice_sent' | 'resolved'>('all');

  // Generator Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorDiscrepancySummary | null>(null);
  const [commType, setCommType] = useState<'email_advisory' | 'urgent_reminder' | 'legal_notice' | 'settlement_demand'>('email_advisory');
  const [previewMode, setPreviewMode] = useState<'preview' | 'legal_document' | 'raw_text'>('preview');

  // Notice form fields
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subjectText, setSubjectText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [curePeriod, setCurePeriod] = useState(7);
  const [selectedInvoices, setSelectedInvoices] = useState<DiscrepancyInvoice[]>([]);
  const [customRefNumber, setCustomRefNumber] = useState('');

  // Resolution / Tracking modal
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolvingVendorGstin, setResolvingVendorGstin] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load discrepancies & communication history
  const loadData = async () => {
    setLoading(true);
    try {
      const [discList, commList] = await Promise.all([
        getVendorDiscrepancies(activeClientId, 10, 2023),
        getVendorCommunications(activeClientId),
      ]);
      setDiscrepancies(discList);
      setCommunications(commList);

      // Auto-open vendor if initialSupplierGstin provided
      if (initialSupplierGstin) {
        const found = discList.find((v) => v.supplier_gstin === initialSupplierGstin);
        if (found) {
          handleOpenNoticeGenerator(found);
        }
      }
    } catch (err) {
      console.error('Failed to load communication dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeClientId]);

  // Handle opening notice generator for a specific vendor
  const handleOpenNoticeGenerator = (
    vendor: VendorDiscrepancySummary,
    preferredType: 'email_advisory' | 'urgent_reminder' | 'legal_notice' | 'settlement_demand' = 'email_advisory'
  ) => {
    setSelectedVendor(vendor);
    setCommType(preferredType);
    setSelectedInvoices(vendor.invoices);
    setRecipientEmail(vendor.supplier_email || `accounts@${vendor.supplier_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'vendor'}.in`);
    setCurePeriod(preferredType === 'legal_notice' ? 7 : 5);

    const ref = preferredType === 'legal_notice'
      ? `LEGAL/GST/SEC16/2023-24/${Math.floor(1000 + Math.random() * 9000)}`
      : `DISP/GST/2023-10/${Math.floor(1000 + Math.random() * 9000)}`;
    setCustomRefNumber(ref);

    // Generate initial draft
    const ctx = {
      clientName,
      clientGstin,
      vendorName: vendor.supplier_name,
      vendorGstin: vendor.supplier_gstin,
      vendorEmail: vendor.supplier_email,
      periodMonth: 10,
      periodYear: 2023,
      invoices: vendor.invoices,
      totalTaxAtRisk: vendor.total_tax_at_risk,
      caFirmName: firmName,
      cureDays: preferredType === 'legal_notice' ? 7 : 5,
      referenceNumber: ref,
    };

    if (preferredType === 'legal_notice') {
      const doc = generateFormalLegalNotice(ctx);
      setSubjectText(`FORMAL STATUTORY NOTICE UNDER SECTION 16(2)(aa) & 16(2)(c) OF CGST ACT, 2017: ${formatINR(vendor.total_tax_at_risk)}`);
      setBodyText(doc.plainText);
      setPreviewMode('legal_document');
    } else if (preferredType === 'urgent_reminder') {
      const draft = generateUrgentReminderEmail(ctx);
      setSubjectText(draft.subject);
      setBodyText(draft.plainText);
      setPreviewMode('preview');
    } else if (preferredType === 'settlement_demand') {
      const draft = generateSettlementDemandEmail(ctx);
      setSubjectText(draft.subject);
      setBodyText(draft.plainText);
      setPreviewMode('preview');
    } else {
      const draft = generateAdvisoryEmail(ctx);
      setSubjectText(draft.subject);
      setBodyText(draft.plainText);
      setPreviewMode('preview');
    }

    setIsModalOpen(true);
  };

  // Re-generate draft whenever commType or selected invoices change in generator
  const regenerateDraft = (
    newType: 'email_advisory' | 'urgent_reminder' | 'legal_notice' | 'settlement_demand',
    invoicesToUse = selectedInvoices
  ) => {
    if (!selectedVendor) return;
    setCommType(newType);

    const totalRisk = invoicesToUse.reduce((sum, i) => sum + i.itcDiff, 0);

    const ctx = {
      clientName,
      clientGstin,
      vendorName: selectedVendor.supplier_name,
      vendorGstin: selectedVendor.supplier_gstin,
      vendorEmail: recipientEmail,
      periodMonth: 10,
      periodYear: 2023,
      invoices: invoicesToUse,
      totalTaxAtRisk: totalRisk,
      caFirmName: firmName,
      cureDays: curePeriod,
      referenceNumber: customRefNumber,
    };

    if (newType === 'legal_notice') {
      const doc = generateFormalLegalNotice(ctx);
      setSubjectText(`FORMAL STATUTORY NOTICE UNDER SECTION 16(2)(aa) & 16(2)(c) OF CGST ACT, 2017: ${formatINR(totalRisk)}`);
      setBodyText(doc.plainText);
      setPreviewMode('legal_document');
    } else if (newType === 'urgent_reminder') {
      const draft = generateUrgentReminderEmail(ctx);
      setSubjectText(draft.subject);
      setBodyText(draft.plainText);
      setPreviewMode('preview');
    } else if (newType === 'settlement_demand') {
      const draft = generateSettlementDemandEmail(ctx);
      setSubjectText(draft.subject);
      setBodyText(draft.plainText);
      setPreviewMode('preview');
    } else {
      const draft = generateAdvisoryEmail(ctx);
      setSubjectText(draft.subject);
      setBodyText(draft.plainText);
      setPreviewMode('preview');
    }
  };

  // Dispatch notice via Email
  const handleDispatchNotice = async () => {
    if (!selectedVendor) return;
    setIsProcessing(true);

    try {
      const totalRisk = selectedInvoices.reduce((sum, i) => sum + i.itcDiff, 0);

      // Save record in database
      const saveRes = await saveVendorCommunication({
        client_id: activeClientId,
        supplier_gstin: selectedVendor.supplier_gstin,
        supplier_name: selectedVendor.supplier_name,
        communication_type: commType,
        subject: subjectText,
        body: bodyText,
        reference_number: customRefNumber,
        legal_sections: commType === 'legal_notice'
          ? ['Section 16(2)(aa)', 'Section 16(2)(c)', 'Rule 36(4)', 'Section 50(3)']
          : ['Section 16(2)(aa)', 'Rule 36(4)'],
        invoices: selectedInvoices,
        total_tax_at_risk: totalRisk,
        recipient_email: recipientEmail,
        status: 'sent',
        dispatch_mode: commType === 'legal_notice' ? 'speed_post' : 'email',
        cure_period_days: curePeriod,
        sent_by_name: firmName,
      });

      if (saveRes.data?.id) {
        await sendVendorCommunication(
          saveRes.data.id,
          commType === 'legal_notice' ? 'speed_post' : 'email',
          customRefNumber,
          firmName
        );
      }

      showToast(`Notice ${customRefNumber} successfully recorded and dispatched to ${recipientEmail}`);
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(`Error dispatching notice: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Open default mail client with pre-filled content
  const handleOpenMailto = () => {
    if (!recipientEmail || !subjectText || !bodyText) return;
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
      subjectText
    )}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;
    showToast('Opened default email client with populated draft.');
  };

  // Copy notice to clipboard
  const handleCopyNotice = () => {
    navigator.clipboard.writeText(bodyText);
    showToast('Notice text copied to clipboard!');
  };

  // Print Legal Document
  const handlePrintDocument = () => {
    if (!selectedVendor) return;
    const ctx = {
      clientName,
      clientGstin,
      vendorName: selectedVendor.supplier_name,
      vendorGstin: selectedVendor.supplier_gstin,
      vendorEmail: recipientEmail,
      periodMonth: 10,
      periodYear: 2023,
      invoices: selectedInvoices,
      totalTaxAtRisk: selectedInvoices.reduce((sum, i) => sum + i.itcDiff, 0),
      caFirmName: firmName,
      cureDays: curePeriod,
      referenceNumber: customRefNumber,
    };

    const doc = generateFormalLegalNotice(ctx);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(doc.htmlDocument);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      showToast('Popup blocked. Please allow popups to print notice.');
    }
  };

  // Mark Vendor Resolved
  const handleMarkResolved = async () => {
    if (!resolvingVendorGstin) return;
    setIsProcessing(true);

    try {
      // Find latest comm for this vendor
      const matched = communications.find((c) => c.supplier_gstin === resolvingVendorGstin);
      if (matched) {
        await updateCommunicationStatus(matched.id, 'resolved', resolveNotes || 'Discrepancy reconciled in GSTR-1 amendment.');
      } else {
        await saveVendorCommunication({
          client_id: activeClientId,
          supplier_gstin: resolvingVendorGstin,
          supplier_name: discrepancies.find((d) => d.supplier_gstin === resolvingVendorGstin)?.supplier_name || 'Vendor',
          communication_type: 'email_advisory',
          subject: 'Discrepancy Resolved',
          body: resolveNotes || 'Vendor uploaded GSTR-1 amendment. Discrepancy successfully resolved.',
          total_tax_at_risk: 0,
          status: 'resolved',
          notes: resolveNotes,
        });
      }

      showToast(`Vendor ${resolvingVendorGstin} marked as Resolved.`);
      setIsResolveModalOpen(false);
      setResolvingVendorGstin(null);
      setResolveNotes('');
      await loadData();
    } catch (err: any) {
      showToast(`Error updating resolution: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered discrepancies
  const filteredVendors = useMemo(() => {
    return discrepancies.filter((v) => {
      const matchesSearch =
        v.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.supplier_gstin.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'action_needed') {
        return v.latest_status === 'none' || v.latest_status === 'draft';
      }
      if (statusFilter === 'notice_sent') {
        return v.latest_status === 'sent' || v.latest_status === 'delivered';
      }
      if (statusFilter === 'resolved') {
        return v.latest_status === 'resolved';
      }
      return true;
    });
  }, [discrepancies, searchQuery, statusFilter]);

  // Aggregate Metrics
  const totalVendorsCount = discrepancies.length;
  const totalTaxAtRisk = discrepancies.reduce((sum, d) => sum + d.total_tax_at_risk, 0);
  const totalInvoicesFlagged = discrepancies.reduce((sum, d) => sum + d.invoices_count, 0);
  const dispatchedCount = communications.filter((c) => c.status === 'sent' || c.status === 'delivered').length;
  const resolvedCount = discrepancies.filter((d) => d.latest_status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium">{toastMessage}</p>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white text-sm ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Header & Active Client Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-semibold text-xs rounded border border-rose-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Prompt 9: Statutory Communication Engine
              </span>
              <span className="text-xs text-slate-400 font-medium">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">October 2023 Cycle</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Vendor Communications & Legal Notices
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Automate recovery of blocked Input Tax Credit. Issue formal Section 16(2)(aa) discrepancy notices, track delivery, and enforce legal indemnity for unfiled invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-right">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Client</div>
              <div className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{clientName}</div>
              <div className="text-xs font-mono text-indigo-600 font-medium">{clientGstin}</div>
            </div>

            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="h-10 px-3.5 text-xs text-slate-700 border-slate-300 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* High-Impact Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Total ITC at Risk</span>
              <DollarSign className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-extrabold text-rose-700 mt-1.5">
              {formatINR(totalTaxAtRisk)}
            </div>
            <div className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              <span>{totalInvoicesFlagged} unreflected / mismatched invoices</span>
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Flagged Vendors</span>
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-800 mt-1.5">
              {totalVendorsCount}
            </div>
            <div className="text-xs text-amber-700 mt-1">
              Suppliers with missing GSTR-1 filings
            </div>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Dispatched Notices</span>
              <Send className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-indigo-800 mt-1.5">
              {dispatchedCount}
            </div>
            <div className="text-xs text-indigo-600 mt-1">
              Emails & Statutory notices delivered
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Resolved Mismatches</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-800 mt-1.5">
              {resolvedCount}
            </div>
            <div className="text-xs text-emerald-700 mt-1">
              ITC recovered via GSTR-1 amendments
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('discrepancies')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'discrepancies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Vendor Discrepancy Ledger ({discrepancies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Communication History & Audit Log ({communications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('statutory')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'statutory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Statutory Framework (CGST Act Sections)</span>
        </button>
      </div>

      {/* TAB 1: DISCREPANCY LEDGER */}
      {activeTab === 'discrepancies' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor by name or GSTIN..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Vendors</option>
                <option value="action_needed">Action Required (Unsent)</option>
                <option value="notice_sent">Notice Dispatched</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Vendors Discrepancy Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Vendor Entity & GSTIN</th>
                    <th className="py-3 px-4">Discrepancy Breakdown</th>
                    <th className="py-3 px-4 text-right">Taxable Value</th>
                    <th className="py-3 px-4 text-right">ITC at Risk</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Compliance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVendors.length > 0 ? (
                    filteredVendors.map((vendor) => (
                      <tr key={vendor.supplier_gstin} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{vendor.supplier_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                              {vendor.supplier_gstin}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {vendor.supplier_email || 'No email registered'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {vendor.missing_in_2b_count > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                {vendor.missing_in_2b_count} Missing in 2B
                              </span>
                            )}
                            {vendor.value_mismatch_count > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {vendor.value_mismatch_count} Value Mismatch
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Invoices: {vendor.invoices.map((i) => i.invoiceNumber).join(', ')}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          {formatINR(vendor.total_taxable_value)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-rose-600">{formatINR(vendor.total_tax_at_risk)}</div>
                          <div className="text-[10px] text-slate-400">Sec 16(2)(aa) Block</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {vendor.latest_status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Send className="w-3 h-3" />
                              Notice Sent
                            </span>
                          ) : vendor.latest_status === 'resolved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" />
                              Resolved
                            </span>
                          ) : vendor.latest_status === 'draft' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Draft Saved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              Action Needed
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleOpenNoticeGenerator(vendor, 'email_advisory')}
                              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 shadow-xs cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Draft Email</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenNoticeGenerator(vendor, 'legal_notice')}
                              className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 gap-1 cursor-pointer"
                            >
                              <Scale className="w-3.5 h-3.5 text-slate-600" />
                              <span>Legal Notice</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setResolvingVendorGstin(vendor.supplier_gstin);
                                setIsResolveModalOpen(true);
                              }}
                              title="Mark Resolved"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-600 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No Discrepant Vendors Found</p>
                        <p className="text-xs text-slate-400 mt-1">All vendor invoices for this period are fully reconciled.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMMUNICATION HISTORY & AUDIT LOG */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Dispatched Vendor Communications & Audit Trail</h3>
            <span className="text-xs text-slate-500">{communications.length} logged actions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Dispatch Mode</th>
                  <th className="py-3 px-4">Vendor & Recipient</th>
                  <th className="py-3 px-4">Communication Type</th>
                  <th className="py-3 px-4">Reference No.</th>
                  <th className="py-3 px-4 text-right">Tax at Risk</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {communications.length > 0 ? (
                  communications.map((comm) => (
                    <tr key={comm.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 text-xs">
                          {new Date(comm.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
                          {comm.dispatch_mode?.replace('_', ' ') || 'Email'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{comm.supplier_name}</div>
                        <div className="text-[11px] font-mono text-indigo-600">{comm.supplier_gstin}</div>
                        {comm.recipient_email && (
                          <div className="text-[11px] text-slate-500">{comm.recipient_email}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                          {comm.communication_type === 'legal_notice'
                            ? '📜 Legal Notice'
                            : comm.communication_type === 'urgent_reminder'
                            ? '⚠️ Urgent Reminder'
                            : '📧 Advisory Email'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-slate-600">
                          {comm.reference_number || 'REF-N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-800 text-xs">
                        {formatINR(comm.total_tax_at_risk)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            comm.status === 'sent'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : comm.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {comm.status === 'sent' ? 'Dispatched' : comm.status === 'resolved' ? 'Resolved' : 'Draft'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedVendor({
                              supplier_gstin: comm.supplier_gstin,
                              supplier_name: comm.supplier_name,
                              supplier_email: comm.recipient_email,
                              invoices_count: comm.invoices?.length || 1,
                              missing_in_2b_count: 1,
                              value_mismatch_count: 0,
                              total_tax_at_risk: comm.total_tax_at_risk,
                              total_taxable_value: comm.total_tax_at_risk / 0.18,
                              invoices: comm.invoices || [],
                              latest_status: comm.status as any,
                            });
                            setCommType(comm.communication_type as any);
                            setSubjectText(comm.subject);
                            setBodyText(comm.body);
                            setRecipientEmail(comm.recipient_email || '');
                            setCustomRefNumber(comm.reference_number || '');
                            setIsModalOpen(true);
                          }}
                          className="h-7 text-xs border-slate-200 cursor-pointer"
                        >
                          View Notice
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No communications logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STATUTORY FRAMEWORK REFERENCE */}
      {activeTab === 'statutory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-indigo-700">
              <Scale className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-sm">Section 16(2)(aa) — The GSTR-2B Mandate</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inserted via the Finance Act, 2021 (w.e.f. January 1, 2022). Mandates that no registered recipient can claim Input Tax Credit unless the details of the invoice or debit note have been furnished by the supplier in Form GSTR-1 / IFF and communicated to the recipient in Form GSTR-2B.
            </p>
            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700">
              Statutory Effect: Unmatched invoices cannot be claimed in GSTR-3B under any circumstances.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-indigo-700">
              <Scale className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-sm">Section 16(2)(c) — Actual Tax Remittance</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ITC is subject to the condition that the tax charged has actually been paid to the Government, either in cash or through utilization of admissible credit. Failure by the supplier to remit collected GST leaves the recipient exposed to recovery.
            </p>
            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700">
              Commercial Remedy: Buyer has equitable right to recover or withhold funds until tax deposit is certified.
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-indigo-700">
              <Scale className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-sm">Section 50(3) — Statutory Interest Liability</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mandatory statutory interest at the rate of <strong>18% per annum</strong> applies where Input Tax Credit has been wrongly availed and utilized. The legal notice holds the defaulting vendor liable to indemnify this interest cost.
            </p>
            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700">
              Liability Formula: Interest = Disputed ITC &times; 18% &times; (Days Delayed / 365)
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-indigo-700">
              <Scale className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-sm">Commercial Lien & Set-off Rights</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Under common law and the Indian Contract Act, 1872, where a vendor causes direct monetary loss by failing to perform statutory tax duties, the buyer can assert a lien on pending disbursements or set off the loss against future invoices.
            </p>
            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700">
              Recommended: Issue formal notice before exercising withholding to establish legal defense.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NOTICE GENERATOR MODAL / WORKSPACE                                        */}
      {/* ========================================================================= */}
      {isModalOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Vendor Communication & Statutory Notice Studio
                  </h2>
                  <p className="text-xs text-slate-500">
                    Drafting for <strong>{selectedVendor.supplier_name}</strong> ({selectedVendor.supplier_gstin})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                  Risk: {formatINR(selectedInvoices.reduce((s, i) => s + i.itcDiff, 0))}
                </span>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Subheader: Template Type Selector */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
                  Notice Type:
                </span>
                <button
                  onClick={() => regenerateDraft('email_advisory')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    commType === 'email_advisory'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📧 Advisory Email
                </button>
                <button
                  onClick={() => regenerateDraft('urgent_reminder')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    commType === 'urgent_reminder'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ⚠️ Urgent Reminder
                </button>
                <button
                  onClick={() => regenerateDraft('legal_notice')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    commType === 'legal_notice'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📜 Formal Statutory Notice
                </button>
              </div>

              {/* View Switcher */}
              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100">
                <button
                  onClick={() => setPreviewMode('preview')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                    previewMode === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Email View
                </button>
                <button
                  onClick={() => setPreviewMode('legal_document')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                    previewMode === 'legal_document' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Document View
                </button>
                <button
                  onClick={() => setPreviewMode('raw_text')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                    previewMode === 'raw_text' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Editable Text
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Controls (4 cols on lg) */}
              <div className="lg:col-span-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor Email Recipient
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="accounts@vendor.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference Tracking No.
                  </label>
                  <input
                    type="text"
                    value={customRefNumber}
                    onChange={(e) => setCustomRefNumber(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Statutory Cure Period (Days)
                  </label>
                  <select
                    value={curePeriod}
                    onChange={(e) => {
                      const days = Number(e.target.value);
                      setCurePeriod(days);
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value={5}>5 Business Days (Advisory)</option>
                    <option value={7}>7 Days (Statutory Demand)</option>
                    <option value={15}>15 Days (Extended Period)</option>
                  </select>
                </div>

                {/* Disputed Invoices Selection List */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Disputed Invoices ({selectedInvoices.length}/{selectedVendor.invoices.length})
                    </label>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                    {selectedVendor.invoices.map((inv) => {
                      const isChecked = selectedInvoices.some((i) => i.invoiceNumber === inv.invoiceNumber);
                      return (
                        <label
                          key={inv.invoiceNumber}
                          className="flex items-start gap-2 text-xs text-slate-800 p-1.5 rounded hover:bg-white cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let next: DiscrepancyInvoice[];
                              if (e.target.checked) {
                                next = [...selectedInvoices, inv];
                              } else {
                                next = selectedInvoices.filter((i) => i.invoiceNumber !== inv.invoiceNumber);
                              }
                              setSelectedInvoices(next);
                              regenerateDraft(commType, next);
                            }}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{inv.invoiceNumber}</div>
                            <div className="text-[10px] text-slate-500">
                              Dt: {inv.invoiceDate} &bull; ITC: {formatINR(inv.itcDiff)}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Subject Line Preview/Edit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email / Notice Subject
                  </label>
                  <textarea
                    rows={2}
                    value={subjectText}
                    onChange={(e) => setSubjectText(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Right Column: Live Interactive Preview (8 cols on lg) */}
              <div className="lg:col-span-8 flex flex-col h-full min-h-[420px]">
                {previewMode === 'preview' && (
                  <div className="flex-1 border border-slate-200 rounded-xl p-5 bg-slate-50 overflow-y-auto text-xs text-slate-800 font-sans space-y-4 shadow-inner">
                    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
                      <div className="border-b border-slate-100 pb-3 mb-3">
                        <div className="text-[11px] text-slate-400 font-medium">SUBJECT:</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{subjectText}</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          TO: <span className="font-mono text-indigo-600">{recipientEmail}</span>
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 leading-relaxed">
                        {bodyText}
                      </pre>
                    </div>
                  </div>
                )}

                {previewMode === 'legal_document' && (
                  <div className="flex-1 border border-slate-300 rounded-xl p-6 bg-white overflow-y-auto shadow-sm">
                    {/* Simulated CA Firm Letterhead */}
                    <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
                      <div>
                        <div className="text-lg font-serif font-bold text-slate-900 tracking-wide uppercase">
                          {firmName}
                        </div>
                        <div className="text-[11px] text-slate-600 font-serif">
                          Chartered Accountants & Legal GST Advisory Practice
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold uppercase rounded">
                          Speed Post A.D. & Email
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          Ref: {customRefNumber}
                        </div>
                      </div>
                    </div>

                    <div className="font-serif text-slate-900 text-xs leading-relaxed space-y-3">
                      <div className="p-2.5 bg-slate-50 border-l-4 border-slate-900 font-sans text-xs font-bold text-slate-800">
                        {subjectText}
                      </div>
                      <pre className="whitespace-pre-wrap font-serif text-xs leading-relaxed text-slate-800">
                        {bodyText}
                      </pre>
                    </div>
                  </div>
                )}

                {previewMode === 'raw_text' && (
                  <div className="flex-1 flex flex-col">
                    <textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      className="w-full flex-1 p-4 text-xs font-mono bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyNotice}
                  className="h-9 text-xs border-slate-300 text-slate-700 gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintDocument}
                  className="h-9 text-xs border-slate-300 text-slate-700 gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF Document</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenMailto}
                  className="h-9 text-xs border-slate-300 text-slate-700 gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Mail App</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 text-xs text-slate-600 cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={handleDispatchNotice}
                  disabled={isProcessing}
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-4 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Dispatching...' : 'Dispatch & Record Notice'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESOLUTION MODAL */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Mark Vendor Discrepancy as Resolved
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Confirm that the supplier ({resolvingVendorGstin}) has uploaded the missing invoices or filed Table 9A amendments in their GSTR-1.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Notes / GSTR-1 ARN Reference
                </label>
                <textarea
                  rows={3}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g., Vendor confirmed ARN AA2710230009812. Invoices reflected in latest GSTR-2B."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="text-xs h-8 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleMarkResolved}
                  disabled={isProcessing}
                  className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Resolution</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
