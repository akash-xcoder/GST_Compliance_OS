'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useClient } from '@/context/ClientContext';
import {
  AnnualDossierReportData,
  formatINR,
  generateSyntheticUDIN,
  downloadAnnualDossierPDF,
} from '@/lib/utils/reportGenerator';
import {
  getDossierArchiveRecordsAction,
  buildAnnualDossierReportAction,
  saveAuditDossierRecordAction,
  ArchivedDossierRecord,
} from '@/app/dashboard/reports/actions';
import {
  FileCheck,
  Building2,
  Calendar,
  Award,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Scale,
  FileSpreadsheet,
  ShieldCheck,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Eye,
  FileText,
  BadgeCheck,
  Layers,
  HelpCircle,
  Copy,
  Check,
  Stamp,
  Sliders,
  Share2,
  Plus,
} from 'lucide-react';

export default function AuditReportsPage() {
  const { clients, currentClient, setCurrentClient, selectedFirmId, firmName } = useClient();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'studio' | 'archive'>('studio');

  // Selected client & financial year for report generation
  const [selectedClientId, setSelectedClientId] = useState<string>(
    currentClient?.id || (clients[0] ? clients[0].id : '')
  );
  const [selectedFY, setSelectedFY] = useState<string>('2025-26');

  // Firm Branding & Partner details configuration
  const [caFirmName, setCaFirmName] = useState('Kapur & Associates, Chartered Accountants');
  const [firmFrn, setFirmFrn] = useState('108429W');
  const [partnerName, setPartnerName] = useState('CA Rajesh Kapur, FCA');
  const [membershipNo, setMembershipNo] = useState('108429');
  const [udin, setUdin] = useState('26108429AAAAAA9921');
  const [opinionType, setOpinionType] = useState<
    'Unqualified (True & Fair)' | 'Qualified (Subject to Discrepancies)' | 'Adverse'
  >('Unqualified (True & Fair)');
  const [qualificationNotes, setQualificationNotes] = useState('');
  const [customDisclaimer, setCustomDisclaimer] = useState('');

  // Report Data & Archive states
  const [reportData, setReportData] = useState<AnnualDossierReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [archiveRecords, setArchiveRecords] = useState<ArchivedDossierRecord[]>([]);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveFYFilter, setArchiveFYFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedUdin, setCopiedUdin] = useState(false);

  // Sync selectedClientId when currentClient changes
  useEffect(() => {
    if (currentClient && currentClient.id !== selectedClientId) {
      setSelectedClientId(currentClient.id);
    }
  }, [currentClient, selectedClientId]);

  // Selected client object
  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0] || null;
  }, [clients, selectedClientId]);

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate new UDIN helper
  const handleGenerateUDIN = () => {
    const newUdin = generateSyntheticUDIN(membershipNo, selectedFY.slice(0, 4));
    setUdin(newUdin);
    showToast(`✨ Generated ICAI UDIN: ${newUdin}`);
  };

  // Copy UDIN to clipboard
  const handleCopyUDIN = () => {
    if (!udin) return;
    navigator.clipboard.writeText(udin);
    setCopiedUdin(true);
    setTimeout(() => setCopiedUdin(false), 2000);
    showToast('UDIN copied to clipboard');
  };

  // Fetch / Assemble Dossier Data
  const loadDossierData = useCallback(async () => {
    if (!activeClient) return;
    setIsGenerating(true);

    const res = await buildAnnualDossierReportAction({
      clientId: activeClient.id,
      clientName: activeClient.name,
      clientGstin: activeClient.gstin,
      clientPan: activeClient.pan || activeClient.gstin.slice(2, 12),
      financialYear: selectedFY,
      firmName: caFirmName,
      firmFrn,
      partnerName,
      membershipNumber: membershipNo,
      customUdin: udin,
      opinionType,
      qualificationNotes: qualificationNotes || undefined,
      customDisclaimer: customDisclaimer || undefined,
    });

    setIsGenerating(false);
    if (res.success && res.data) {
      setReportData(res.data);
    }
  }, [
    activeClient,
    selectedFY,
    caFirmName,
    firmFrn,
    partnerName,
    membershipNo,
    udin,
    opinionType,
    qualificationNotes,
    customDisclaimer,
  ]);

  // Load archive list
  const loadArchive = useCallback(async () => {
    const res = await getDossierArchiveRecordsAction(selectedFirmId || 'default-firm');
    if (res.success && res.data) {
      setArchiveRecords(res.data);
    }
  }, [selectedFirmId]);

  // Initial loads
  useEffect(() => {
    loadDossierData();
  }, [loadDossierData]);

  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

  // Handle Export PDF
  const handleExportPDF = () => {
    if (!reportData) return;
    try {
      downloadAnnualDossierPDF(reportData);
      showToast('📄 Annual GST Audit Dossier PDF downloaded successfully');
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      showToast('Error generating PDF file');
    }
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Handle Save / Approve Dossier
  const handleSaveAndApprove = async () => {
    if (!reportData || !activeClient) return;
    setIsSaving(true);

    const res = await saveAuditDossierRecordAction({
      firmId: selectedFirmId || 'default-firm',
      clientId: activeClient.id,
      clientName: activeClient.name,
      clientGstin: activeClient.gstin,
      financialYear: selectedFY,
      reportTitle: `Annual GST Reconciliation & Statutory Assessment Dossier (GSTR-9C) - FY ${selectedFY}`,
      reportStatus: 'Approved_and_Signed',
      opinionType: reportData.auditInfo.opinionType,
      turnoverBooks: reportData.turnoverRecon.adjustedTurnoverBooks,
      turnoverGstr1: reportData.turnoverRecon.taxableTurnoverGstr1,
      turnoverVariance: reportData.turnoverRecon.unreconciledDifferenceGstr1VsBooks,
      itcBooks: reportData.itcRecon.itcAsPerBooks,
      itcGstr2b: reportData.itcRecon.itcAsPerGstr2B,
      itcRule36Exposure: reportData.itcRecon.rule36_4RiskExposure,
      scrutinyExposure: reportData.scrutinyExposure.totalCumulativeExposure,
      partnerName: reportData.auditInfo.partnerName,
      partnerMembershipNo: reportData.auditInfo.membershipNumber,
      firmRegNo: reportData.firm.frn,
      udin: reportData.auditInfo.udin,
      qualificationNotes: reportData.auditInfo.qualificationNotes,
      legalDisclaimer: reportData.auditInfo.legalDisclaimer,
    });

    setIsSaving(false);
    if (res.success) {
      showToast('✅ Dossier officially approved, signed with UDIN, and archived!');
      loadArchive();
      setActiveTab('archive');
    }
  };

  // Filtered Archive Records
  const filteredArchive = useMemo(() => {
    return archiveRecords.filter((rec) => {
      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase();
        const matchesClient = rec.client_name.toLowerCase().includes(q);
        const matchesGstin = rec.client_gstin.toLowerCase().includes(q);
        const matchesUdin = (rec.udin || '').toLowerCase().includes(q);
        if (!matchesClient && !matchesGstin && !matchesUdin) return false;
      }
      if (archiveFYFilter !== 'all' && rec.financial_year !== archiveFYFilter) {
        return false;
      }
      return true;
    });
  }, [archiveRecords, archiveSearch, archiveFYFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Executive CA Audit Reports &amp; GSTR-9C Assessment Dossier
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory audit statement generator aggregating Turnover, ITC, and ASMT-10 exposure with ICAI UDIN endorsement
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'studio'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Dossier Studio &amp; Preview</span>
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'archive'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Audit Archive ({archiveRecords.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Highlights Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Archived Dossiers</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{archiveRecords.length}</span>
            <span className="text-xs text-slate-500">Financial Years</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            {archiveRecords.filter((r) => r.report_status === 'Approved_and_Signed').length} Signed with UDIN
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Active Audit Client</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 truncate">
            <span className="text-base font-bold text-slate-900 truncate block">
              {activeClient?.name || 'No Client Selected'}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-500">
            {activeClient?.gstin || 'Select client below'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Turnover Variance</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                reportData && Math.abs(reportData.turnoverRecon.unreconciledDifferenceGstr1VsBooks) < 1000
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}
            >
              {reportData ? formatINR(reportData.turnoverRecon.unreconciledDifferenceGstr1VsBooks) : '₹0.00'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            {reportData && Math.abs(reportData.turnoverRecon.unreconciledDifferenceGstr1VsBooks) < 1000
              ? '100% Reconciled with Books'
              : 'Requires GSTR-9 adjustment'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Scrutiny Risk Exposure</span>
            <Scale className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {reportData ? formatINR(reportData.scrutinyExposure.totalCumulativeExposure) : '₹0.00'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            {reportData?.scrutinyExposure.activeNoticesCount || 0} Notices under Defense
          </div>
        </div>
      </div>

      {/* 3. Tab 1: Dossier Studio & Live Document Preview */}
      {activeTab === 'studio' && (
        !activeClient ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
            <Building2 className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 text-lg">No Client Organizations Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
              Add your first client organization to generate firm-branded annual GST reconciliation &amp; assessment dossiers (GSTR-9C ready) with ICAI UDIN verification.
            </p>
            <Link href="/dashboard/onboarding">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Onboard First Client</span>
              </Button>
            </Link>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Configuration Controls (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Audit Engagement Parameters
                  </h3>
                </div>
                <button
                  onClick={loadDossierData}
                  disabled={isGenerating}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  title="Re-aggregate dossier numbers"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Client Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Client Entity</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    const found = clients.find((c) => c.id === e.target.value);
                    if (found) setCurrentClient(found);
                  }}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.gstin})
                    </option>
                  ))}
                </select>
              </div>

              {/* Financial Year */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Audit Financial Year</label>
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="2025-26">FY 2025-26 (Assessment Year 2026-27)</option>
                  <option value="2024-25">FY 2024-25 (Assessment Year 2025-26)</option>
                  <option value="2023-24">FY 2023-24 (Assessment Year 2024-25)</option>
                  <option value="2022-23">FY 2022-23 (Assessment Year 2023-24)</option>
                </select>
              </div>

              {/* CA Firm Branding */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-[11px] font-bold text-slate-600 block">CA Firm Branding</span>

                <div className="space-y-1">
                  <label className="text-[10.5px] text-slate-500">Firm Name</label>
                  <input
                    type="text"
                    value={caFirmName}
                    onChange={(e) => setCaFirmName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10.5px] text-slate-500">Firm Reg. No. (FRN)</label>
                    <input
                      type="text"
                      value={firmFrn}
                      onChange={(e) => setFirmFrn(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10.5px] text-slate-500">ICAI Membership</label>
                    <input
                      type="text"
                      value={membershipNo}
                      onChange={(e) => setMembershipNo(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] text-slate-500">Signing Partner</label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50/50"
                  />
                </div>
              </div>

              {/* UDIN Generator & Endorsement */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Stamp className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ICAI Unique Document ID (UDIN)</span>
                  </label>
                  <button
                    onClick={handleGenerateUDIN}
                    className="text-[10.5px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    Generate UDIN
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={udin}
                    onChange={(e) => setUdin(e.target.value)}
                    placeholder="26108429AAAAAA9921"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono tracking-wider font-bold text-indigo-900 bg-indigo-50/40"
                  />
                  <button
                    onClick={handleCopyUDIN}
                    className="p-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50"
                    title="Copy UDIN"
                  >
                    {copiedUdin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Audit Opinion Type */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Audit Opinion Type</label>
                <select
                  value={opinionType}
                  onChange={(e) => setOpinionType(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Unqualified (True & Fair)">Unqualified (True &amp; Fair View)</option>
                  <option value="Qualified (Subject to Discrepancies)">Qualified (Subject to Discrepancies)</option>
                  <option value="Adverse">Adverse Opinion</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  onClick={handleExportPDF}
                  disabled={!reportData || isGenerating}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Client-Ready PDF</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handlePrint}
                    className="py-2 px-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Dossier</span>
                  </button>

                  <button
                    onClick={handleSaveAndApprove}
                    disabled={isSaving || !reportData}
                    className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-xs"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BadgeCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Sign &amp; Archive</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Live Document Preview (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  GSTR-9C Self-Certification Ready
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  UDIN: {udin || 'Pending Endorsement'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            {/* Document Paper Container (simulating official physical dossier page) */}
            <div className="bg-white border border-slate-300 rounded-2xl shadow-md p-6 sm:p-10 space-y-8 font-sans print:border-none print:shadow-none print:p-0">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-5 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                      {caFirmName}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Chartered Accountants • Firm Registration No: {firmFrn} • Peer Reviewed
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Suite 401, Nariman Bhavan, Nariman Point, Mumbai - 400021 • compliance@kapurassociates.in
                    </p>
                  </div>

                  {/* UDIN Official Verification Stamp Badge */}
                  <div className="border border-indigo-300 bg-indigo-50/60 rounded-xl p-2.5 text-center min-w-[170px] shrink-0">
                    <span className="text-[9px] font-bold text-indigo-700 tracking-wider uppercase block">
                      Official ICAI Endorsement
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                      {udin}
                    </span>
                    <span className="text-[8.5px] text-slate-500 block mt-0.5">
                      Sec 35(5) / Rule 80(3) Certified
                    </span>
                  </div>
                </div>

                <div className="pt-3 text-center">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight uppercase">
                    Annual GST Reconciliation &amp; Statutory Assessment Dossier
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Foundational Audit Dossier for Form GSTR-9 (Annual Return) &amp; Form GSTR-9C (Reconciliation Statement)
                  </p>
                </div>
              </div>

              {/* Taxpayer Particulars Summary Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 border border-slate-200 rounded-xl p-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Legal Name:</span>
                    <span className="font-bold text-slate-900">{activeClient?.name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Trade Name:</span>
                    <span className="text-slate-800">{activeClient?.trade_name || activeClient?.name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">GSTIN:</span>
                    <span className="font-mono font-bold text-indigo-900">{activeClient?.gstin}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Permanent A/c (PAN):</span>
                    <span className="font-mono text-slate-700">{activeClient?.pan || activeClient?.gstin.slice(2, 12)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l sm:pl-4 border-slate-200 pt-2 sm:pt-0">
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Financial Year:</span>
                    <span className="font-bold text-slate-900">{selectedFY}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Assessment Year:</span>
                    <span className="text-slate-800">2026-27</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Audit Opinion:</span>
                    <span className="font-bold text-emerald-700">{opinionType}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-medium">Signing Auditor:</span>
                    <span className="text-slate-800">
                      {partnerName} (Mem. No: {membershipNo})
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Turnover Reconciliation (Books vs GSTR-1/3B) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span>1. Turnover Reconciliation Statement (GSTR-9C Table 5 &amp; 7)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">Currency: INR (₹)</span>
                </div>

                {reportData && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="p-2.5 w-12 text-center">Sr.</th>
                          <th className="p-2.5">Turnover Description / Statutory Head</th>
                          <th className="p-2.5 text-right w-36">Amount (₹)</th>
                          <th className="p-2.5 w-48">Audit Verification Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        <tr>
                          <td className="p-2 text-center font-mono text-slate-400">A</td>
                          <td className="p-2">Gross Turnover as per Audited Financial Statements / P&amp;L</td>
                          <td className="p-2 text-right font-mono font-bold">
                            {formatINR(reportData.turnoverRecon.grossTurnoverBooks)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Verified against audited balance sheet</td>
                        </tr>
                        <tr className="bg-slate-50/40">
                          <td className="p-2 text-center font-mono text-slate-400">B</td>
                          <td className="p-2">(+) Unbilled revenue / Timing adjustments at beginning of FY</td>
                          <td className="p-2 text-right font-mono">
                            {formatINR(reportData.turnoverRecon.unbilledRevenue)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Recognized under GST Section 13/31</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-center font-mono text-slate-400">C</td>
                          <td className="p-2">(+) Advances received on which GST is liable</td>
                          <td className="p-2 text-right font-mono">
                            {formatINR(reportData.turnoverRecon.advancesReceived)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Time of supply triggered on advance</td>
                        </tr>
                        <tr className="bg-slate-50/40">
                          <td className="p-2 text-center font-mono text-slate-400">D</td>
                          <td className="p-2">(-) Credit notes issued after year-end for FY supplies</td>
                          <td className="p-2 text-right font-mono text-slate-600">
                            {formatINR(reportData.turnoverRecon.creditNotesTimingDiff)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Books timing adjustment post March</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-center font-mono text-slate-400">E</td>
                          <td className="p-2">(-) Exempted, Nil-rated, and Non-GST outward turnover</td>
                          <td className="p-2 text-right font-mono text-slate-600">
                            {formatINR(reportData.turnoverRecon.exemptTurnover)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Schedule III non-taxable / zero-rated</td>
                        </tr>
                        <tr className="bg-indigo-50/60 font-semibold border-t border-b border-indigo-200">
                          <td className="p-2 text-center font-mono text-indigo-900">F</td>
                          <td className="p-2 font-bold text-indigo-950">
                            (=) Adjusted Taxable Turnover as per Books of Accounts
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-indigo-950">
                            {formatINR(reportData.turnoverRecon.adjustedTurnoverBooks)}
                          </td>
                          <td className="p-2 text-indigo-900 text-[11px]">Base taxable turnover for GSTR-9C</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-center font-mono text-slate-400">G</td>
                          <td className="p-2 font-medium">Outward Taxable Turnover declared in Form GSTR-1</td>
                          <td className="p-2 text-right font-mono font-bold">
                            {formatINR(reportData.turnoverRecon.taxableTurnoverGstr1)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Aggregated GSTR-1 Table 4 + 5</td>
                        </tr>
                        <tr className="bg-slate-50/40">
                          <td className="p-2 text-center font-mono text-slate-400">H</td>
                          <td className="p-2 font-medium">Turnover reported &amp; Tax Discharged in Form GSTR-3B</td>
                          <td className="p-2 text-right font-mono font-bold">
                            {formatINR(reportData.turnoverRecon.turnoverDischargedGstr3b)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Table 3.1(a) of periodic returns</td>
                        </tr>
                        <tr className="bg-emerald-50/50 font-bold border-t border-slate-200">
                          <td className="p-2 text-center font-mono text-emerald-800">I</td>
                          <td className="p-2 text-emerald-950">
                            UNRECONCILED VARIANCE: GSTR-1 vs Adjusted Books [G - F]
                          </td>
                          <td
                            className={`p-2 text-right font-mono font-bold ${
                              Math.abs(reportData.turnoverRecon.unreconciledDifferenceGstr1VsBooks) < 1000
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {formatINR(reportData.turnoverRecon.unreconciledDifferenceGstr1VsBooks)}
                          </td>
                          <td className="p-2 text-emerald-800 text-[11px]">
                            {Math.abs(reportData.turnoverRecon.unreconciledDifferenceGstr1VsBooks) < 1000
                              ? 'Fully Reconciled (Nil Gap)'
                              : 'Differential requires GSTR-9 disclosure'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. ITC Reconciliation (Books vs GSTR-2B vs GSTR-3B) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>2. Input Tax Credit (ITC) Reconciliation &amp; Rule 36(4) Evaluation</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">Section 16(2)(aa) Statutory Match</span>
                </div>

                {reportData && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="p-2.5 w-12 text-center">Sr.</th>
                          <th className="p-2.5">ITC Particulars / Statutory Head</th>
                          <th className="p-2.5 text-right w-36">Amount (₹)</th>
                          <th className="p-2.5 w-48">Audit Compliance Verdict</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        <tr>
                          <td className="p-2 text-center font-mono text-slate-400">A</td>
                          <td className="p-2">Gross ITC as per Books of Accounts (Purchase Register)</td>
                          <td className="p-2 text-right font-mono font-bold">
                            {formatINR(reportData.itcRecon.itcAsPerBooks)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Accounted in ERP purchase ledger</td>
                        </tr>
                        <tr className="bg-slate-50/40">
                          <td className="p-2 text-center font-mono text-slate-400">B</td>
                          <td className="p-2 font-medium">Auto-populated Eligible ITC available in GSTR-2B</td>
                          <td className="p-2 text-right font-mono font-bold text-indigo-900">
                            {formatINR(reportData.itcRecon.itcAsPerGstr2B)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Static portal statement ceiling</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-center font-mono text-slate-400">C</td>
                          <td className="p-2 font-medium">Total ITC Claimed in Table 4(A) of Form GSTR-3B</td>
                          <td className="p-2 text-right font-mono font-bold">
                            {formatINR(reportData.itcRecon.itcClaimedInGstr3B)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Credit claimed across periodic returns</td>
                        </tr>
                        <tr className="bg-slate-50/40">
                          <td className="p-2 text-center font-mono text-slate-400">D</td>
                          <td className="p-2 text-rose-700">(-) Ineligible ITC reversed under Section 17(5)</td>
                          <td className="p-2 text-right font-mono text-rose-700">
                            {formatINR(reportData.itcRecon.ineligibleItcSection17_5)}
                          </td>
                          <td className="p-2 text-slate-500 text-[11px]">Motor vehicles, personal supplies</td>
                        </tr>
                        <tr className="bg-emerald-50/50 font-bold border-t border-slate-200">
                          <td className="p-2 text-center font-mono text-emerald-800">E</td>
                          <td className="p-2 text-emerald-950">
                            RULE 36(4) COMPLIANCE EXPOSURE: Excess Claim vs 2B [C - B]
                          </td>
                          <td
                            className={`p-2 text-right font-mono font-bold ${
                              reportData.itcRecon.rule36_4RiskExposure > 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {formatINR(reportData.itcRecon.rule36_4RiskExposure)}
                          </td>
                          <td className="p-2 text-[11px]">
                            {reportData.itcRecon.rule36_4RiskExposure > 0 ? (
                              <span className="text-rose-700 font-bold">Section 73 recovery risk</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">100% GSTR-2B Backing Verified</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. Departmental Scrutiny & Risk Exposure */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-rose-600" />
                    <span>3. Active Departmental Scrutiny (ASMT-10 / DRC-01) &amp; Risk Matrix</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {reportData?.scrutinyExposure.activeNoticesCount || 0} Notices Pending
                  </span>
                </div>

                {reportData && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {reportData.scrutinyExposure.noticesList.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 bg-slate-50/50">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                        <span className="font-semibold text-slate-700">Clean Scrutiny Record:</span> Zero active
                        notices or demand orders pending before GST tax authorities.
                      </div>
                    ) : (
                      <table className="w-full text-left">
                        <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="p-2.5">Notice Ref.</th>
                            <th className="p-2.5">Type</th>
                            <th className="p-2.5">Allegation Category</th>
                            <th className="p-2.5 text-right">Tax Demand</th>
                            <th className="p-2.5 text-right">Total Exposure</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {reportData.scrutinyExposure.noticesList.map((n, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-mono font-bold text-indigo-900">
                                {n.notice_reference_no}
                              </td>
                              <td className="p-2 font-semibold text-slate-700">{n.notice_type}</td>
                              <td className="p-2 text-slate-600 text-[11px]">{n.allegation_category}</td>
                              <td className="p-2 text-right font-mono font-bold">{formatINR(n.demand_tax)}</td>
                              <td className="p-2 text-right font-mono font-bold text-rose-700">
                                {formatINR(n.demand_tax + n.demand_interest + n.demand_penalty)}
                              </td>
                              <td className="p-2 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {n.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>

              {/* 4. CA Certification & Legal Disclaimers */}
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>4. Chartered Accountant Certification &amp; Statutory Opinion</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">
                    I/We have examined the audited financial records, periodic returns, and statutory registers of{' '}
                    <strong>{activeClient?.name}</strong> (GSTIN: {activeClient?.gstin}) for the financial year{' '}
                    <strong>{selectedFY}</strong>. Based on our verification, the information presented in this
                    Reconciliation Dossier is in agreement with the records and reflects a{' '}
                    <strong className="text-indigo-900">{opinionType}</strong> in terms of Rule 80(3) of the CGST
                    Rules, 2017.
                  </p>
                </div>

                {/* Audit Qualifications box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Audit Observations &amp; Qualifications:
                  </span>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed font-sans">
                    {reportData?.auditInfo.qualificationNotes}
                  </p>
                </div>

                {/* Legal Disclaimer */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-1">
                  <span className="text-[10.5px] font-bold text-amber-900 block">
                    Statutory Limitation of Liability &amp; Disclaimers:
                  </span>
                  <p className="text-[11px] text-amber-800 leading-relaxed text-justify">
                    {reportData?.auditInfo.legalDisclaimer}
                  </p>
                </div>

                {/* Signature Block */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                  <div className="text-xs space-y-1 text-slate-600">
                    <div>
                      Place: <strong className="text-slate-800">Mumbai</strong>
                    </div>
                    <div>
                      Date: <strong className="text-slate-800">{reportData?.generatedDate}</strong>
                    </div>
                    <div>
                      Auditor Capacity: <strong className="text-slate-800">Statutory GST Auditor</strong>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-xs font-bold text-slate-900 uppercase">
                      For and on behalf of {caFirmName}
                    </div>
                    <div className="text-xs text-slate-600">FRN: {firmFrn}</div>
                    <div className="py-2">
                      <span className="inline-block border-b border-dashed border-slate-400 w-36 text-center text-[10px] text-slate-400">
                        [Partner Signature]
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{partnerName}</div>
                    <div className="text-[11px] text-slate-500">
                      Partner • Membership No. {membershipNo}
                    </div>
                    <div className="font-mono text-xs font-bold text-indigo-700 mt-1">
                      UDIN: {udin}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )
      )}

      {/* 4. Tab 2: Audit Archive Ledger */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          {/* Archive Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder="Search by client name, GSTIN, or UDIN..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={archiveFYFilter}
                onChange={(e) => setArchiveFYFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">All Financial Years</option>
                <option value="2025-26">FY 2025-26</option>
                <option value="2024-25">FY 2024-25</option>
                <option value="2023-24">FY 2023-24</option>
              </select>

              <button
                onClick={loadArchive}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
                title="Refresh archive"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Master Archive Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Firm Annual Audit Dossier Repository ({filteredArchive.length} Archived Dossiers)
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                ICAI Peer Review Compliant Record Store
              </span>
            </div>

            {filteredArchive.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No Archived Dossiers Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Generate and approve audit dossiers from the Dossier Studio tab to populate the firm permanent ledger.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Client &amp; GSTIN</th>
                      <th className="p-3.5">Financial Year</th>
                      <th className="p-3.5">Turnover Audited</th>
                      <th className="p-3.5">ITC Claimed &amp; Gap</th>
                      <th className="p-3.5">Audit Opinion</th>
                      <th className="p-3.5">Partner &amp; UDIN</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredArchive.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{rec.client_name}</div>
                          <div className="text-[11px] font-mono text-slate-500">{rec.client_gstin}</div>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200">
                            FY {rec.financial_year}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-mono font-bold text-slate-900">{formatINR(rec.turnover_books)}</div>
                          <div
                            className={`text-[10px] font-mono ${
                              Math.abs(rec.turnover_variance) < 1000 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            Var: {formatINR(rec.turnover_variance)}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-mono text-slate-800">{formatINR(rec.itc_books)}</div>
                          <div
                            className={`text-[10px] font-bold ${
                              rec.itc_rule36_4_exposure > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {rec.itc_rule36_4_exposure > 0
                              ? `Rule 36(4): ${formatINR(rec.itc_rule36_4_exposure)}`
                              : '100% 2B matched'}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10.5px] font-semibold ${
                              rec.opinion_type.includes('Unqualified')
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {rec.opinion_type}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{rec.partner_name}</div>
                          <div className="font-mono text-[10.5px] text-indigo-700 mt-0.5">
                            {rec.udin || 'N/A'}
                          </div>
                        </td>

                        <td className="p-3.5">
                          {rec.report_status === 'Approved_and_Signed' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <BadgeCheck className="w-3 h-3 text-emerald-600" />
                              Signed &amp; Sealed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Review Pending
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedClientId(rec.client_id);
                              setSelectedFY(rec.financial_year);
                              setActiveTab('studio');
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-indigo-200 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Dossier</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
