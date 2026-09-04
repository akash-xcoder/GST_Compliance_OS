'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  DepartmentNotice,
  NoticeReply,
  STATUTORY_PRECEDENTS,
  StatutoryPrecedent,
  verifyStatutoryInterest,
  generateASMT11LegalNoticeDocument,
} from '@/lib/scrutiny/statutory-defense';
import { formatINR } from '@/lib/notices/email-templates';
import {
  saveNoticeReplyAction,
  submitNoticeReplyARNAction,
  updateNoticeStatusAction,
} from '@/app/dashboard/scrutiny/actions';
import {
  ArrowLeft,
  Printer,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Calculator,
  FileText,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  BadgeCheck,
  Send,
} from 'lucide-react';

interface DefenseStudioProps {
  notice: DepartmentNotice;
  existingReply?: NoticeReply;
  client: {
    id: string;
    name: string;
    gstin: string;
    tradeName?: string;
    address?: string;
  };
  caFirmName?: string;
  onBack: () => void;
  onRefreshNotice: () => void;
}

export function DefenseStudio({
  notice,
  existingReply,
  client,
  caFirmName = 'Kapur & Associates, Chartered Accountants',
  onBack,
  onRefreshNotice,
}: DefenseStudioProps) {
  // Navigation & Tabs
  const [activePreviewTab, setActivePreviewTab] = useState<'document' | 'portal_text' | 'annexure'>('document');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedPortalText, setCopiedPortalText] = useState(false);
  const [showArnModal, setShowArnModal] = useState(false);
  const [enteredArn, setEnteredArn] = useState(existingReply?.arn || '');
  const [arnSubmissionDate, setArnSubmissionDate] = useState(
    existingReply?.submitted_at ? existingReply.submitted_at.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [isSubmittingArn, setIsSubmittingArn] = useState(false);

  // Form State
  const [replyRefNo, setReplyRefNo] = useState(
    existingReply?.reply_reference_no || `ASMT11/${notice.notice_reference_no.replace(/[^a-zA-Z0-9]/g, '')}/01`
  );
  const [replyDate, setReplyDate] = useState(
    existingReply?.reply_date || new Date().toISOString().split('T')[0]
  );
  const [properOfficerTitle, setProperOfficerTitle] = useState(
    notice.issuing_authority || 'Superintendent of Central Tax, Range-IV, Division-II'
  );
  const [jurisdictionOffice, setJurisdictionOffice] = useState(
    notice.jurisdiction_office || 'Mumbai Central Commissionerate'
  );

  // Rebuttal Arguments
  const [preliminaryObjections, setPreliminaryObjections] = useState(
    existingReply?.preliminary_objections ||
      `The Assessee has strictly fulfilled all conditions precedents set forth under Section 16(2) of the CGST Act, 2017. The Assessee holds valid tax invoices, has physically received the underlying goods/services along with valid e-way bills and delivery challans, and has fully discharged the consideration including tax via banking channels within the statutory 180-day limitation.`
  );

  const defaultRebuttal = useMemo(() => {
    if (notice.allegation_category === 'ITC_2B_VS_3B') {
      return `1. In respect of Invoice GAP/23-24/0981 issued by M/s Gujarat Apex Petrochem Pvt Ltd (GSTIN: 24AAACH8765B1Z1), the supplier had inadvertently omitted to report the invoice in Form GSTR-1 for November 2021. However, upon being alerted by the Assessee, the supplier duly incorporated the invoice in Table 9 of Form GSTR-1 for March 2022 and paid the tax.\n\n2. In respect of M/s Shree Krishna Industrial Fasteners, the Assessee is a bonafide purchaser in terms of Section 16(2). All payments were remitted via RTGS (UTR # AXISB210988271) and goods were moved under valid E-Way Bill # 211098441201. Any subsequent cancellation of the vendor's GSTIN cannot operate retrospectively to divest a bonafide recipient of its vested statutory credit (Calcutta High Court in Suncraft Energies).\n\n3. The Assessee maintained sufficient closing balance in its Electronic Credit Ledger at all relevant times; hence, no interest is attracted under Section 50(3) read with Rule 88B(3).`;
    }
    if (notice.allegation_category === 'GSTR_1_VS_3B') {
      return `1. The discrepancy between Table 3.1(a) of Form GSTR-3B and Table 4 of Form GSTR-1 for August 2022 is an apparent reconciliation timing difference.\n\n2. Credit notes amounting to ₹3,77,777.78 were netted off against outward taxable supplies directly in Form GSTR-3B in terms of Circular No. 26/26/2017-GST, whereas the gross turnover was reflected in GSTR-1. There is no revenue loss or tax shortfall.`;
    }
    return `1. The Assessee has complied with all statutory requirements under the CGST Act, 2017. The transaction is supported by valid tax invoices, delivery challans, and proof of banking payments.\n\n2. The allegation raised in the notice is contrary to documentary evidence on record.`;
  }, [notice.allegation_category]);

  const [factualRebuttal, setFactualRebuttal] = useState(
    existingReply?.factual_rebuttal || defaultRebuttal
  );

  // Selected Statutory Precedents
  const [selectedPrecedents, setSelectedPrecedents] = useState<StatutoryPrecedent[]>(() => {
    if (existingReply?.statutory_citations && existingReply.statutory_citations.length > 0) {
      return existingReply.statutory_citations;
    }
    return STATUTORY_PRECEDENTS.filter((p) => p.isSelectedDefault);
  });

  // Section 50 Interest Verification Calculator State
  const [availableCreditBalance, setAvailableCreditBalance] = useState<number>(notice.demand_tax * 1.5); // Default assumed surplus
  const [daysDelayed, setDaysDelayed] = useState<number>(180);
  const [isTaxPaidViaCash, setIsTaxPaidViaCash] = useState<boolean>(false);

  const interestResult = useMemo(() => {
    return verifyStatutoryInterest({
      demandTax: notice.demand_tax,
      availableCreditBalance,
      daysDelayed,
      isTaxPaidViaCash,
    });
  }, [notice.demand_tax, availableCreditBalance, daysDelayed, isTaxPaidViaCash]);

  // Tax Dispute Allocations
  const [taxAccepted, setTaxAccepted] = useState<number>(existingReply?.tax_accepted || 0);
  const taxDisputed = Math.max(0, notice.demand_tax - taxAccepted);
  const interestComputed = interestResult.lawfulInterestSection50_3;
  const interestDisputed = Math.max(0, notice.demand_interest - interestComputed);
  const penaltyDisputed = notice.demand_penalty;

  // DRC-03 Challan Details for voluntary acceptance
  const [enableDrc03, setEnableDrc03] = useState<boolean>(
    Boolean(existingReply?.challan_details?.arn) || taxAccepted > 0
  );
  const [drc03Arn, setDrc03Arn] = useState(existingReply?.challan_details?.arn || '');
  const [drc03Amount, setDrc03Amount] = useState<number>(
    existingReply?.challan_details?.amount_paid || taxAccepted
  );
  const [drc03Date, setDrc03Date] = useState(
    existingReply?.challan_details?.payment_date || new Date().toISOString().split('T')[0]
  );

  // Verification Signatory
  const [signatoryName, setSignatoryName] = useState(
    existingReply?.verified_by_name || 'Rajesh Mehta'
  );
  const [signatoryDesignation, setSignatoryDesignation] = useState(
    existingReply?.verified_by_designation || 'Director & Authorized Signatory'
  );

  // Workflow Status
  const [currentStatus, setCurrentStatus] = useState(existingReply?.status || notice.status);

  // Toggle Precedent
  const togglePrecedent = (precedent: StatutoryPrecedent) => {
    if (selectedPrecedents.some((p) => p.id === precedent.id)) {
      setSelectedPrecedents(selectedPrecedents.filter((p) => p.id !== precedent.id));
    } else {
      setSelectedPrecedents([...selectedPrecedents, precedent]);
    }
  };

  // Generate ASMT-11 Legal Document and Portal Text
  const generatedOutput = useMemo(() => {
    return generateASMT11LegalNoticeDocument({
      clientName: client.name,
      clientGstin: client.gstin,
      clientAddress: client.address,
      properOfficerTitle,
      jurisdictionOffice,
      noticeRefNo: notice.notice_reference_no,
      noticeDate: notice.issue_date,
      noticeType: notice.notice_type,
      financialYear: notice.financial_year,
      replyRefNo,
      replyDate,
      allegationCategory: notice.allegation_category,
      preliminaryObjections,
      factualRebuttal,
      statutoryCitations: selectedPrecedents,
      discrepancyItems: notice.discrepancy_items,
      demandTax: notice.demand_tax,
      demandInterest: notice.demand_interest,
      demandPenalty: notice.demand_penalty,
      taxAccepted,
      taxDisputed,
      interestComputed,
      interestDisputed,
      penaltyDisputed,
      challanDetails: enableDrc03
        ? {
            arn: drc03Arn,
            amount_paid: drc03Amount,
            payment_date: drc03Date,
          }
        : undefined,
      signatoryName,
      signatoryDesignation,
      caFirmName,
    });
  }, [
    client,
    properOfficerTitle,
    jurisdictionOffice,
    notice,
    replyRefNo,
    replyDate,
    preliminaryObjections,
    factualRebuttal,
    selectedPrecedents,
    taxAccepted,
    taxDisputed,
    interestComputed,
    interestDisputed,
    penaltyDisputed,
    enableDrc03,
    drc03Arn,
    drc03Amount,
    drc03Date,
    signatoryName,
    signatoryDesignation,
    caFirmName,
  ]);

  // Handle Save
  const handleSaveDraft = async (newStatus: 'Draft' | 'Partner Approved' = 'Draft') => {
    setIsSaving(true);
    setSaveSuccess(false);

    const res = await saveNoticeReplyAction({
      noticeId: notice.id,
      clientId: client.id,
      replyReferenceNo: replyRefNo,
      factualRebuttal,
      preliminaryObjections,
      statutoryCitations: selectedPrecedents,
      taxAccepted,
      taxDisputed,
      interestComputed,
      interestDisputed,
      penaltyDisputed,
      challanDetails: enableDrc03
        ? {
            arn: drc03Arn,
            amount_paid: drc03Amount,
            payment_date: drc03Date,
          }
        : undefined,
      status: newStatus,
      signatoryName,
      signatoryDesignation,
    });

    setIsSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setCurrentStatus(newStatus);
      onRefreshNotice();
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Copy portal text to clipboard
  const handleCopyPortalText = () => {
    navigator.clipboard.writeText(generatedOutput.portalText);
    setCopiedPortalText(true);
    setTimeout(() => setCopiedPortalText(false), 2500);
  };

  // Print Document
  const handlePrintDocument = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatedOutput.htmlDocument);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  // Submit Official ARN
  const handleSubmitArn = async () => {
    if (!enteredArn.trim()) return;
    setIsSubmittingArn(true);
    const res = await submitNoticeReplyARNAction({
      noticeId: notice.id,
      clientId: client.id,
      arn: enteredArn.trim(),
      submissionDate: arnSubmissionDate,
    });
    setIsSubmittingArn(false);
    if (res.success) {
      setShowArnModal(false);
      setCurrentStatus('Submitted_ASMT11');
      onRefreshNotice();
    }
  };

  // Days left calculation
  const daysLeft = useMemo(() => {
    const due = new Date(notice.due_date).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  }, [notice.due_date]);

  return (
    <div className="space-y-5">
      {/* Top Header & Breadcrumb Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Scrutiny Ledger"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {notice.notice_type}
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {notice.notice_reference_no}
              </h2>
              <span className="text-xs text-slate-500">FY {notice.financial_year}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: <span className="font-medium text-slate-700">{client.name}</span> ({client.gstin})
            </p>
          </div>
        </div>

        {/* Due Date & Action Badges */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Due date countdown */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              daysLeft < 0
                ? 'bg-red-100 text-red-800 border-red-300'
                : daysLeft <= 7
                ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {daysLeft < 0
                ? `Overdue by ${Math.abs(daysLeft)} days`
                : daysLeft === 0
                ? 'Due Today!'
                : `${daysLeft} days remaining (Due: ${notice.due_date})`}
            </span>
          </div>

          {/* Status Badge */}
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              currentStatus === 'Submitted_ASMT11'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : currentStatus === 'Partner Approved'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            Stage: {currentStatus.replace('_', ' ')}
          </span>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveDraft('Draft')}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>

            <button
              onClick={() => handleSaveDraft('Partner Approved')}
              disabled={isSaving || currentStatus === 'Submitted_ASMT11'}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{currentStatus === 'Partner Approved' ? 'Partner Approved ✓' : 'Approve Defense'}</span>
            </button>

            <button
              onClick={() => setShowArnModal(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{existingReply?.arn ? `ARN: ${existingReply.arn}` : 'Log Official ARN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Statutory reply draft saved successfully to compliance ledger.</span>
        </div>
      )}

      {/* Main Dual-Pane Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Defense Arguments, Section 50 Calculator & Controls (7 Cols) */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-4">
          {/* Case Allegation Overview Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Allegation Facts & Demand Breakdown
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Notice Category: {notice.allegation_category.replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
              {notice.allegation_description ||
                'Scrutiny of return under Section 61 indicates differences between taxable supplies/ITC.'}
            </p>

            {/* Demand Summary Matrix */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Tax Demand</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">{formatINR(notice.demand_tax)}</div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Interest (50)</div>
                <div className="text-xs font-bold text-amber-700 mt-0.5">{formatINR(notice.demand_interest)}</div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Penalty (122)</div>
                <div className="text-xs font-bold text-slate-700 mt-0.5">{formatINR(notice.demand_penalty)}</div>
              </div>
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
                <div className="text-[10px] text-indigo-700 uppercase tracking-wider font-bold">Total Demand</div>
                <div className="text-xs font-extrabold text-indigo-950 mt-0.5">
                  {formatINR(notice.demand_tax + notice.demand_interest + notice.demand_penalty)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 50(1) vs 50(3) Interest Verification Calculator */}
          <div className="bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/40 border border-indigo-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-700" />
                <h3 className="text-sm font-bold text-indigo-950">
                  Section 50(1) vs 50(3) Statutory Interest Verification
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                Rule 88B(3)
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tax authorities routinely issue demands calculating interest at gross rates on the entire tax demand. Under retrospective Section 50(3) and CBIC Circular 192/04/2023, interest on wrongly availed ITC applies <strong>only if availed AND utilized</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Electronic Credit Balance (₹)
                </label>
                <input
                  type="number"
                  value={availableCreditBalance}
                  onChange={(e) => setAvailableCreditBalance(Number(e.target.value) || 0)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 200000"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Ledger closing balance</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Delay Period (Days)
                </label>
                <input
                  type="number"
                  value={daysDelayed}
                  onChange={(e) => setDaysDelayed(Number(e.target.value) || 0)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="180"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Days between due date & reply</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Liability Settlement Mode
                </label>
                <select
                  value={isTaxPaidViaCash ? 'cash' : 'credit'}
                  onChange={(e) => setIsTaxPaidViaCash(e.target.value === 'cash')}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="credit">Electronic Credit Ledger (Section 50(3))</option>
                  <option value="cash">Electronic Cash Ledger (Section 50(1))</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Payment route</span>
              </div>
            </div>

            {/* Computation Result Bar */}
            <div className="bg-white border border-indigo-100 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800">
                  Lawful Statutory Interest: <span className="text-emerald-700">{formatINR(interestResult.lawfulInterestSection50_3)}</span>
                  <span className="text-xs text-slate-400 font-normal line-through ml-2">
                    {formatINR(interestResult.allegedGrossInterest)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">{interestResult.statutoryRationale}</div>
              </div>
              <div className="shrink-0 text-right">
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200">
                  {formatINR(interestResult.disputedExcessInterest)} Disputed Excess
                </span>
              </div>
            </div>
          </div>

          {/* Precedents Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-700" />
                <h3 className="text-sm font-bold text-slate-800">
                  High Court Precedents & Bonafide Buyer Rulings
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                {selectedPrecedents.length} Precedents Enclosed
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {STATUTORY_PRECEDENTS.map((precedent) => {
                const isSelected = selectedPrecedents.some((p) => p.id === precedent.id);
                return (
                  <label
                    key={precedent.id}
                    className={`block p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-300 text-slate-900'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePrecedent(precedent)}
                        className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{precedent.caseName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                            {precedent.court}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed italic">
                          "{precedent.ratioDecidendi}"
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Factual Rebuttal Editor */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-800">Point-by-Point Factual Rebuttal</h3>
              </div>
              <span className="text-xs text-slate-500">Drafted for Form GST ASMT-11</span>
            </div>

            <textarea
              rows={6}
              value={factualRebuttal}
              onChange={(e) => setFactualRebuttal(e.target.value)}
              className="w-full text-xs font-sans p-3 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed"
              placeholder="Enter factual explanation, invoice verification proofs, timing adjustments..."
            />

            {/* Quick-insert tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  setFactualRebuttal(
                    (prev) =>
                      prev +
                      `\n\n- The discrepancy is purely a timing difference. The vendor duly paid the tax in subsequent GSTR-1 return under Section 37(3).`
                  )
                }
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] text-slate-700 transition-colors"
              >
                + Add Timing Diff Note
              </button>
              <button
                type="button"
                onClick={() =>
                  setFactualRebuttal(
                    (prev) =>
                      prev +
                      `\n\n- All payments were remitted through proper banking channels within 180 days under 2nd proviso to Section 16(2); bank statement extracts attached.`
                  )
                }
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] text-slate-700 transition-colors"
              >
                + Add 180 Days Bank Payment Proof
              </button>
              <button
                type="button"
                onClick={() =>
                  setFactualRebuttal(
                    (prev) =>
                      prev +
                      `\n\n- Taxpayer holds valid E-Way Bills proving genuine physical movement of goods as held in Calcutta HC ruling in Suncraft Energies.`
                  )
                }
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] text-slate-700 transition-colors"
              >
                + Add E-Way Bill Movement Proof
              </button>
            </div>
          </div>

          {/* Voluntary Partial Payment & DRC-03 Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDrc03}
                  onChange={(e) => setEnableDrc03(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-800">
                  Include DRC-03 Voluntary Payment (if partial tax accepted/paid under protest)
                </span>
              </label>
            </div>

            {enableDrc03 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Tax Amount Accepted (₹)
                  </label>
                  <input
                    type="number"
                    value={taxAccepted}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setTaxAccepted(val);
                      setDrc03Amount(val);
                    }}
                    className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. 1800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Form DRC-03 ARN
                  </label>
                  <input
                    type="text"
                    value={drc03Arn}
                    onChange={(e) => setDrc03Arn(e.target.value)}
                    className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none uppercase"
                    placeholder="e.g. AA271023019842M"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={drc03Date}
                    onChange={(e) => setDrc03Date(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Verification & Signatory Meta */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Verification & Legal Signatory
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Authorized Signatory Name
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Signatory Designation
                </label>
                <input
                  type="text"
                  value={signatoryDesignation}
                  onChange={(e) => setSignatoryDesignation(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Live Print-Ready Preview, Portal Text & Annexure (6 Cols) */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-3 sticky top-4">
          {/* Preview Navigation Tabs & Actions Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActivePreviewTab('document')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activePreviewTab === 'document'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ASMT-11 Legal Document
              </button>
              <button
                onClick={() => setActivePreviewTab('portal_text')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activePreviewTab === 'portal_text'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Portal Text (4,000 Chars)
              </button>
              <button
                onClick={() => setActivePreviewTab('annexure')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activePreviewTab === 'annexure'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annexure A ({notice.discrepancy_items?.length || 0})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activePreviewTab === 'portal_text' ? (
                <button
                  onClick={handleCopyPortalText}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedPortalText ? 'Copied!' : 'Copy Portal Text'}</span>
                </button>
              ) : (
                <button
                  onClick={handlePrintDocument}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB CONTENT 1: ASMT-11 Legal Document Preview */}
          {activePreviewTab === 'document' && (
            <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 shadow-inner max-h-[820px] overflow-y-auto">
              <div className="bg-white shadow-md rounded-lg p-6 text-slate-900 font-serif leading-relaxed text-xs border border-slate-200">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start">
                  <div>
                    <h1 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                      {client.name}
                    </h1>
                    <div className="text-[11px] font-mono text-slate-700">GSTIN: {client.gstin}</div>
                    <div className="text-[10px] text-slate-500">{client.address || 'Maharashtra, India'}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Counsel</span>
                    <span className="text-xs font-bold text-indigo-900">{caFirmName}</span>
                  </div>
                </div>

                <div className="text-center font-bold text-sm tracking-wider uppercase">FORM GST ASMT-11</div>
                <div className="text-center text-[10px] italic text-slate-600 mb-3">
                  [See Rule 99(2) of Central Goods and Services Tax Rules, 2017]
                </div>

                {/* Metadata Box */}
                <div className="border border-slate-300 rounded p-3 mb-3 bg-slate-50/50 text-[11px] space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold text-slate-700">Notice Reference: </span>
                      <span className="font-mono text-red-700 font-bold">{notice.notice_reference_no}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Notice Date: </span>
                      <span>{notice.issue_date}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold text-slate-700">Financial Year: </span>
                      <span>{notice.financial_year}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Reply Reference: </span>
                      <span className="font-mono">{replyRefNo}</span>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-slate-200 text-slate-700">
                    <span className="font-semibold">Addressed to: </span>
                    {properOfficerTitle}, {jurisdictionOffice}
                  </div>
                </div>

                {/* Subject */}
                <div className="bg-slate-100 p-2.5 rounded font-bold text-slate-900 border-l-4 border-slate-800 text-[11px] mb-3">
                  SUBJECT: Written Submissions in Form GST ASMT-11 in response to Scrutiny Notice ({notice.notice_type}) Ref {notice.notice_reference_no} for FY {notice.financial_year}.
                </div>

                {/* Body paragraphs */}
                <div className="space-y-2 text-[11px] text-slate-800 text-justify">
                  <p>Respected Sir/Madam,</p>
                  <p>
                    The Assessee acknowledges receipt of notice in <strong>Form {notice.notice_type}</strong> intimating alleged discrepancies in returns for FY {notice.financial_year} proposing tax demand of {formatINR(notice.demand_tax)} with interest and penalty.
                  </p>
                  <p>
                    The Assessee submits that all conditions under Section 16(2) of the CGST Act stand fully satisfied. The detailed point-by-point rebuttal, invoice-level reconciliations, and authoritative High Court rulings are set forth hereunder:
                  </p>

                  <h4 className="font-bold underline text-slate-900 pt-1">I. FACTUAL REBUTTAL & GROUNDS</h4>
                  <div className="whitespace-pre-line pl-2 bg-slate-50/50 p-2 border border-slate-100 rounded">
                    {factualRebuttal}
                  </div>

                  <h4 className="font-bold underline text-slate-900 pt-1">II. JUDICIAL PRECEDENTS</h4>
                  <div className="space-y-1.5">
                    {selectedPrecedents.map((p, i) => (
                      <div key={p.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-[10.5px]">
                        <span className="font-bold">{i + 1}. {p.caseName}</span> — <span className="font-mono text-slate-600">{p.court}</span>
                        <div className="italic text-slate-700 mt-0.5">"{p.ratioDecidendi}"</div>
                      </div>
                    ))}
                  </div>

                  <h4 className="font-bold underline text-slate-900 pt-1">III. SECTION 50 INTEREST VERIFICATION</h4>
                  <p>
                    Interest under Section 50(3) read with Rule 88B(3) is applicable strictly if wrongly availed ITC is utilized. As Assessee maintained sufficient closing balance, demand of {formatINR(notice.demand_interest)} is contrary to CBIC Circular 192/04/2023.
                  </p>

                  <h4 className="font-bold underline text-slate-900 pt-1">IV. PRAYER</h4>
                  <p>
                    In view of the above, it is prayed that the scrutiny proceedings be dropped in full and an order of acceptance in Form GST ASMT-12 be issued under Rule 99(3).
                  </p>
                </div>

                {/* Signatory Footer */}
                <div className="mt-6 pt-4 border-t border-slate-300 flex justify-between items-end text-[11px]">
                  <div>
                    <div>Place: Mumbai</div>
                    <div>Date: {replyDate}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">For {client.name}</div>
                    <div className="mt-8 pt-1 border-t border-dashed border-slate-400 inline-block min-w-[140px] text-center">
                      {signatoryName}
                      <div className="text-[10px] text-slate-500">{signatoryDesignation}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT 2: Portal Text (4,000 Chars limit) */}
          {activePreviewTab === 'portal_text' && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    GST Portal Character Limit Monitor
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      generatedOutput.portalText.length > 4000
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {generatedOutput.portalText.length} / 4000 Characters
                  </span>
                </div>
                <button
                  onClick={handleCopyPortalText}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs text-slate-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedPortalText ? 'Copied to Clipboard!' : 'Copy'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={18}
                value={generatedOutput.portalText}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none leading-relaxed select-all"
              />
              <p className="text-[11px] text-slate-500">
                Tip: Paste this directly into the Form GST ASMT-11 explanation text box on the GST portal, and attach the printed PDF as Annexure.
              </p>
            </div>
          )}

          {/* TAB CONTENT 3: Annexure A Table */}
          {activePreviewTab === 'annexure' && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Annexure-A: Invoice-Wise Discrepancy Statement
                </h3>
                <span className="text-xs text-slate-500">
                  {notice.discrepancy_items?.length || 0} Invoices Flagged
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Supplier & GSTIN</th>
                      <th className="p-2">Invoice No</th>
                      <th className="p-2 text-right">Taxable</th>
                      <th className="p-2 text-right">3B Claimed</th>
                      <th className="p-2 text-right">2B Reflected</th>
                      <th className="p-2 text-right text-red-600">Disputed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {notice.discrepancy_items?.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-2">
                          <div className="font-semibold text-slate-900">{item.supplier_name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{item.supplier_gstin}</div>
                        </td>
                        <td className="p-2">
                          <div className="font-mono text-slate-800">{item.invoice_number}</div>
                          <div className="text-[10px] text-slate-400">{item.invoice_date}</div>
                        </td>
                        <td className="p-2 text-right font-mono">{formatINR(item.taxable_value)}</td>
                        <td className="p-2 text-right font-mono">{formatINR(item.claimed_3b_itc)}</td>
                        <td className="p-2 text-right font-mono">{formatINR(item.reflected_2b_itc)}</td>
                        <td className="p-2 text-right font-mono font-bold text-red-600">
                          {formatINR(item.disputed_itc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Log Official Portal Submission ARN */}
      {showArnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Log Official GST Portal ARN</h3>
                <p className="text-xs text-slate-500">Record submission acknowledgement receipt</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Acknowledgement Reference Number (ARN) *
                </label>
                <input
                  type="text"
                  value={enteredArn}
                  onChange={(e) => setEnteredArn(e.target.value)}
                  placeholder="e.g. AA271023019842M"
                  className="w-full text-sm font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Submission Date *
                </label>
                <input
                  type="date"
                  value={arnSubmissionDate}
                  onChange={(e) => setArnSubmissionDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Statutory Effect:
                </div>
                <p>
                  Recording this ARN will formally mark Notice <strong>{notice.notice_reference_no}</strong> as{' '}
                  <span className="font-semibold underline">Submitted_ASMT11</span> in the compliance audit trail.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowArnModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitArn}
                disabled={!enteredArn.trim() || isSubmittingArn}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingArn ? 'Logging ARN...' : 'Confirm Official Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
