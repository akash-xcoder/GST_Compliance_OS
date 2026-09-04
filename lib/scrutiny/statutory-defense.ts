/**
 * Departmental Scrutiny & Statutory Legal Defense Engine (ASMT-10 / ASMT-11 / DRC-01)
 * PROMPT 10: Form GST ASMT-11 generator, Section 50(1) vs 50(3) interest calculator,
 * and landmark High Court precedents repository for bonafide buyer protection.
 */

import { formatINR } from '@/lib/notices/email-templates';

export interface DiscrepancyItem {
  id?: string;
  supplier_name: string;
  supplier_gstin: string;
  invoice_number: string;
  invoice_date: string;
  taxable_value: number;
  claimed_3b_itc: number;
  reflected_2b_itc: number;
  disputed_itc: number;
  nature_of_mismatch: string;
  status: 'Unfiled_in_GSTR1' | 'Timing_Difference' | 'Late_Filed' | 'Cancelled_Vendor' | 'Reconciled';
  vendor_action_status?: string;
}

export interface DepartmentNotice {
  id: string;
  client_id: string;
  firm_id?: string;
  notice_reference_no: string;
  notice_type: 'ASMT_10' | 'DRC_01A' | 'DRC_01' | 'REG_17';
  financial_year: string;
  issue_date: string;
  due_date: string;
  demand_tax: number;
  demand_interest: number;
  demand_penalty: number;
  allegation_category: 'GSTR_1_VS_3B' | 'ITC_2B_VS_3B' | 'EWAY_BILL_MISMATCH' | 'CANCELLED_SUPPLIER';
  status: 'Under Review' | 'Drafting Reply' | 'Partner Approved' | 'Submitted_ASMT11' | 'Order Passed' | 'Rectified';
  issuing_authority?: string;
  jurisdiction_office?: string;
  allegation_description?: string;
  discrepancy_items: DiscrepancyItem[];
  created_at?: string;
  updated_at?: string;
}

export interface StatutoryPrecedent {
  id: string;
  caseName: string;
  court: string;
  citation: string;
  ratioDecidendi: string;
  relevanceTag: 'Bonafide Buyer' | 'Section 16(2)(c)' | 'Section 50 Interest' | 'GSTR-2A/2B Facilitator';
  isSelectedDefault: boolean;
}

export interface NoticeReply {
  id: string;
  notice_id: string;
  client_id: string;
  firm_id?: string;
  reply_reference_no: string;
  form_type: string; // 'ASMT_11'
  subject: string;
  reply_date: string;
  preliminary_objections: string;
  factual_rebuttal: string;
  statutory_citations: StatutoryPrecedent[];
  reconciliation_annexures: DiscrepancyItem[];
  tax_accepted: number;
  tax_disputed: number;
  interest_computed_50_1: number;
  interest_disputed_50_3: number;
  penalty_disputed: number;
  challan_details?: {
    arn?: string;
    amount_paid?: number;
    payment_date?: string;
    cin?: string;
    tax_head?: string;
  };
  status: 'Draft' | 'Partner Approved' | 'Submitted_ASMT11';
  arn?: string;
  submitted_at?: string;
  verified_by_name?: string;
  verified_by_designation?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InterestVerificationInput {
  demandTax: number;
  availableCreditBalance: number;
  daysDelayed: number;
  isTaxPaidViaCash: boolean;
  interestRateAnnual?: number; // 18% default
}

export interface InterestVerificationResult {
  allegedGrossInterest: number;
  lawfulInterestSection50_1: number;
  lawfulInterestSection50_3: number;
  disputedExcessInterest: number;
  interestSavedPercent: number;
  statutoryRationale: string;
}

/**
 * Landmark High Court & Supreme Court Precedents Repository
 */
export const STATUTORY_PRECEDENTS: StatutoryPrecedent[] = [
  {
    id: 'suncraft_energies',
    caseName: 'Suncraft Energies Pvt. Ltd. & Anr. vs The Assistant Commissioner, State Tax',
    court: 'Calcutta High Court (DB)',
    citation: 'MAT 1218 of 2023 with I.A. No. CAN 1 of 2023 (Judgment dt. 02.08.2023)',
    ratioDecidendi:
      'The Department cannot directly deny Input Tax Credit to a bonafide recipient on the sole ground of non-reflection in GSTR-2A/2B without first exhausting all statutory recovery measures against the defaulting supplier under Section 73 or 74 of the CGST Act.',
    relevanceTag: 'Bonafide Buyer',
    isSelectedDefault: true,
  },
  {
    id: 'arise_india',
    caseName: 'Arise India Limited vs Commissioner of Trade & Taxes',
    court: 'Delhi High Court (Affirmed by Supreme Court in SLP 36717/2017)',
    citation: '(2017) 105 VST 139 (Del HC)',
    ratioDecidendi:
      'The law does not compel a person to do that which he cannot possibly perform (Lex non cogit ad impossibilia). A purchasing dealer who has made banking payments and holds valid invoices cannot verify whether the selling dealer actually remitted the tax into the government exchequer.',
    relevanceTag: 'Section 16(2)(c)',
    isSelectedDefault: true,
  },
  {
    id: 'dy_beathel',
    caseName: 'D.Y. Beathel Enterprises vs The State Tax Officer (Data Cell)',
    court: 'Madras High Court',
    citation: 'W.P. (MD) No. 2127 of 2021 (Judgment dt. 24.02.2021)',
    ratioDecidendi:
      'Assessment and recovery proceedings cannot be fastened upon the purchaser without examining the seller or initiating recovery against the seller who received the tax component from the purchaser.',
    relevanceTag: 'Bonafide Buyer',
    isSelectedDefault: true,
  },
  {
    id: 'bharti_airtel',
    caseName: 'Union of India & Ors. vs Bharti Airtel Ltd. & Anr.',
    court: 'Hon’ble Supreme Court of India',
    citation: '(2021) 130 taxmann.com 329 (SC)',
    ratioDecidendi:
      'Form GSTR-2A is a facilitation tool and does not confer or curtail statutory eligibility of ITC under Section 16(1). The recipient is entitled to claim ITC on self-assessment based on valid statutory tax invoices.',
    relevanceTag: 'GSTR-2A/2B Facilitator',
    isSelectedDefault: true,
  },
  {
    id: 'refex_industries',
    caseName: 'Refex Industries Ltd. vs Assistant Commissioner of CGST',
    court: 'Madras High Court',
    citation: '(2020) 74 GSTR 279 (Mad)',
    ratioDecidendi:
      'Section 50(1) proviso (retrospectively amended w.e.f. 01.07.2017 via Finance Act, 2021) stipulates that interest is leviable only on the delayed payment of tax through Electronic Cash Ledger, and no interest can be demanded on credit ledger balances.',
    relevanceTag: 'Section 50 Interest',
    isSelectedDefault: true,
  },
  {
    id: 'cbic_circular_192',
    caseName: 'CBIC Circular No. 192/04/2023-GST (Clarification on Rule 88B)',
    court: 'Central Board of Indirect Taxes & Customs',
    citation: 'CBIC-190354/133/2023-TRU dt. 17.07.2023',
    ratioDecidendi:
      'In terms of Section 50(3) read with Rule 88B, interest on wrongly availed ITC is leviable ONLY when such ITC is both availed and utilized. If closing balance in the electronic credit ledger remains greater than the wrongly availed ITC, interest liability is NIL.',
    relevanceTag: 'Section 50 Interest',
    isSelectedDefault: true,
  },
];

/**
 * Calculation Verification Engine: Section 50(1) vs 50(3) & Rule 88B
 * Proves that wrongful gross interest demanded by tax officers is ultra-vires
 */
export function verifyStatutoryInterest(input: InterestVerificationInput): InterestVerificationResult {
  const rate = (input.interestRateAnnual || 18) / 100;
  const daysFraction = Math.max(0, input.daysDelayed) / 365;

  // 1. Department's Alleged Gross Interest (Gross Tax * 18% * Days/365)
  const allegedGrossInterest = Math.round(input.demandTax * rate * daysFraction * 100) / 100;

  // 2. Lawful Interest under Proviso to Section 50(1) (Net Cash Liability only)
  let lawfulInterestSection50_1 = 0;
  if (input.isTaxPaidViaCash) {
    lawfulInterestSection50_1 = allegedGrossInterest;
  } else {
    // If adjusted via credit ledger, statutory interest on cash is zero
    lawfulInterestSection50_1 = 0;
  }

  // 3. Lawful Interest under Section 50(3) read with Rule 88B(3)
  // Interest is levied ONLY if the credit balance is utilized (dips below the disputed ITC)
  const utilizedCreditAmount = Math.max(0, input.demandTax - input.availableCreditBalance);
  const lawfulInterestSection50_3 = Math.round(utilizedCreditAmount * rate * daysFraction * 100) / 100;

  // Lawful total is the actual legal exposure
  const lawfulTotal = input.isTaxPaidViaCash ? lawfulInterestSection50_1 : lawfulInterestSection50_3;
  const disputedExcessInterest = Math.max(0, allegedGrossInterest - lawfulTotal);
  const interestSavedPercent =
    allegedGrossInterest > 0 ? Math.round((disputedExcessInterest / allegedGrossInterest) * 100) : 0;

  let statutoryRationale = '';
  if (input.availableCreditBalance >= input.demandTax && !input.isTaxPaidViaCash) {
    statutoryRationale =
      'Zero Interest Payable under Section 50(3): The Assessee maintained sufficient closing credit ledger balance at all times. In accordance with Rule 88B(3) and CBIC Circular 192/04/2023-GST, the credit was never utilized.';
  } else if (!input.isTaxPaidViaCash) {
    statutoryRationale = `Interest restricted to utilized portion (${formatINR(utilizedCreditAmount)}) under Rule 88B(3). Gross demand of ${formatINR(allegedGrossInterest)} is unlawful.`;
  } else {
    statutoryRationale =
      'Interest payable strictly on delayed cash remittance under the proviso to Section 50(1) of the CGST Act, 2017.';
  }

  return {
    allegedGrossInterest,
    lawfulInterestSection50_1,
    lawfulInterestSection50_3: lawfulTotal,
    disputedExcessInterest,
    interestSavedPercent,
    statutoryRationale,
  };
}

/**
 * Format GST ASMT-11 Legal Document Generator
 */
export function generateASMT11LegalNoticeDocument(params: {
  clientName: string;
  clientGstin: string;
  clientAddress?: string;
  properOfficerTitle: string;
  jurisdictionOffice: string;
  noticeRefNo: string;
  noticeDate: string;
  noticeType: string;
  financialYear: string;
  replyRefNo: string;
  replyDate: string;
  allegationCategory: string;
  preliminaryObjections?: string;
  factualRebuttal: string;
  statutoryCitations: StatutoryPrecedent[];
  discrepancyItems: DiscrepancyItem[];
  demandTax: number;
  demandInterest: number;
  demandPenalty: number;
  taxAccepted: number;
  taxDisputed: number;
  interestComputed: number;
  interestDisputed: number;
  penaltyDisputed: number;
  challanDetails?: {
    arn?: string;
    amount_paid?: number;
    payment_date?: string;
    cin?: string;
    tax_head?: string;
  };
  signatoryName: string;
  signatoryDesignation: string;
  caFirmName?: string;
}): { htmlDocument: string; portalText: string } {
  const {
    clientName,
    clientGstin,
    clientAddress = 'Registered Business Premises, MIDC Industrial Area, Maharashtra',
    properOfficerTitle,
    jurisdictionOffice,
    noticeRefNo,
    noticeDate,
    noticeType,
    financialYear,
    replyRefNo,
    replyDate,
    allegationCategory,
    preliminaryObjections,
    factualRebuttal,
    statutoryCitations,
    discrepancyItems,
    demandTax,
    demandInterest,
    demandPenalty,
    taxAccepted,
    taxDisputed,
    interestComputed,
    interestDisputed,
    penaltyDisputed,
    challanDetails,
    signatoryName,
    signatoryDesignation,
    caFirmName = 'Kapur & Associates, Chartered Accountants',
  } = params;

  // Build Portal Plaintext (Concise, structured for 4,000 character limit box on GST portal)
  const portalText = `FORM GST ASMT-11: REPLY TO NOTICE IN ${noticeType}
Reference No: ${noticeRefNo} | Date: ${noticeDate}
Taxpayer: ${clientName} | GSTIN: ${clientGstin} | FY: ${financialYear}
Reply Ref: ${replyRefNo} | Date: ${replyDate}

To: The Proper Officer, ${properOfficerTitle}, ${jurisdictionOffice}

SUBJECT: Reply in Form GST ASMT-11 to Notice ${noticeRefNo} under Section 61/73 for FY ${financialYear}.

1. PRELIMINARY SUBMISSION:
The taxpayer respectfully submits that all conditions under Section 16(2) of the CGST Act, 2017 stand duly fulfilled. Possession of valid tax invoices, receipt of goods/services, and payments through banking channels within 180 days are evidenced in Annexure-A.

2. FACTUAL REBUTTAL & SUMMARY:
${factualRebuttal.slice(0, 1400)}

3. STATUTORY CITATIONS:
${statutoryCitations.map((c, i) => `${i + 1}. ${c.caseName} (${c.court}) - ${c.ratioDecidendi.slice(0, 150)}...`).join('\n')}

4. TAX & INTEREST POSITION:
- Disputed Tax: ${formatINR(taxDisputed)} (Dropped in full)
${taxAccepted > 0 ? `- Tax Accepted & Paid: ${formatINR(taxAccepted)} via DRC-03 ARN ${challanDetails?.arn || 'PENDING'}` : '- Tax Accepted: NIL'}
- Demand Interest under Sec 50(3) Disputed: ${formatINR(interestDisputed)} (Sufficient credit ledger balance maintained as per Rule 88B & Circular 192/04/2023).
- Penalty under Sec 122/73 Disputed: ${formatINR(penaltyDisputed)} (No suppression or willful misstatement).

PRAYER:
In view of factual reconciliation and judicial precedents, it is humbly prayed that the proceedings in ${noticeType} be dropped in full and Form GST ASMT-12 (Order of acceptance) be issued.

Verified by: ${signatoryName} (${signatoryDesignation})
Counsel: ${caFirmName}`;

  // Build HTML Formal Legal Document
  const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FORM GST ASMT-11 - ${noticeRefNo}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm 20mm 15mm; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11.5pt;
      line-height: 1.5;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 24px;
    }
    .header-table { width: 100%; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
    .form-title { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 4px 0; }
    .form-subtitle { text-align: center; font-size: 10pt; font-style: italic; color: #374151; margin-bottom: 12px; }
    .meta-box { width: 100%; border: 1px solid #9ca3af; border-collapse: collapse; margin-bottom: 16px; }
    .meta-box td { padding: 6px 10px; border: 1px solid #d1d5db; font-size: 10pt; vertical-align: top; }
    .meta-label { font-weight: bold; width: 25%; background-color: #f9fafb; color: #1f2937; }
    .subject-box { background: #f3f4f6; border-left: 4px solid #1f2937; padding: 10px 14px; font-weight: bold; margin: 16px 0; font-size: 11pt; }
    h3 { font-size: 11.5pt; text-decoration: underline; margin-top: 18px; margin-bottom: 6px; }
    p { text-align: justify; margin-bottom: 10px; text-indent: 20px; }
    .citation-card { border: 1px solid #cbd5e1; background: #f8fafc; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 10pt; }
    .citation-title { font-weight: bold; color: #0f172a; }
    .citation-body { color: #334155; margin-top: 4px; font-style: italic; }
    table.data-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.5pt; }
    table.data-table th, table.data-table td { border: 1px solid #475569; padding: 6px 8px; text-align: left; }
    table.data-table th { background: #e2e8f0; font-weight: bold; text-align: center; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .verification-box { margin-top: 24px; border: 1px solid #94a3b8; padding: 14px; background: #fafafa; }
    .signature-grid { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 12px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <table class="header-table">
    <tr>
      <td style="width: 70%;">
        <div style="font-size: 16pt; font-weight: bold; color: #111827;">${clientName}</div>
        <div style="font-size: 10pt; color: #4b5563;">GSTIN: <span style="font-family: monospace; font-weight: bold;">${clientGstin}</span></div>
        <div style="font-size: 9.5pt; color: #6b7280;">${clientAddress}</div>
      </td>
      <td style="text-align: right; vertical-align: bottom;">
        <div style="font-size: 9pt; color: #4b5563;">Legal Advisory Counsel:</div>
        <div style="font-size: 10.5pt; font-weight: bold; color: #1e3a8a;">${caFirmName}</div>
      </td>
    </tr>
  </table>

  <div class="form-title">FORM GST ASMT-11</div>
  <div class="form-subtitle">[See Rule 99(2) of the Central Goods and Services Tax Rules, 2017]</div>
  <div style="text-align: center; font-weight: bold; font-size: 10.5pt; margin-bottom: 16px;">
    REPLY TO THE NOTICE FOR INTIMATING DISCREPANCIES IN THE RETURN AFTER SCRUTINY
  </div>

  <!-- NOTICE METADATA BOX -->
  <table class="meta-box">
    <tr>
      <td class="meta-label">1. Legal Name of Taxpayer:</td>
      <td><strong>${clientName}</strong></td>
      <td class="meta-label">2. GSTIN:</td>
      <td><span style="font-family: monospace; font-weight: bold;">${clientGstin}</span></td>
    </tr>
    <tr>
      <td class="meta-label">3. Financial Year / Period:</td>
      <td><strong>${financialYear}</strong></td>
      <td class="meta-label">4. Department Notice Ref No:</td>
      <td><span style="font-family: monospace; font-weight: bold; color: #b91c1c;">${noticeRefNo}</span></td>
    </tr>
    <tr>
      <td class="meta-label">5. Date of Department Notice:</td>
      <td>${noticeDate}</td>
      <td class="meta-label">6. Reply Reference No:</td>
      <td><span style="font-family: monospace; font-weight: bold;">${replyRefNo}</span></td>
    </tr>
    <tr>
      <td class="meta-label">7. Addressed To:</td>
      <td colspan="3">
        The Proper Officer, ${properOfficerTitle},<br/>
        ${jurisdictionOffice}
      </td>
    </tr>
  </table>

  <!-- SUBJECT LINE -->
  <div class="subject-box">
    SUBJECT: FORMAL WRITTEN SUBMISSIONS IN FORM GST ASMT-11 IN RESPONSE TO SCRUTINY NOTICE (${noticeType}) BEARING REF NO. ${noticeRefNo} DATED ${noticeDate} FOR FINANCIAL YEAR ${financialYear}.
  </div>

  <p>Respected Sir / Madam,</p>

  <p>
    The Taxpayer / Assessee, above named, acknowledges the receipt of the communication in <strong>Form ${noticeType}</strong> issued under Section 61 of the Central Goods and Services Tax Act, 2017 (hereinafter referred to as the "CGST Act") wherein certain alleged discrepancies in respect of <strong>${allegationCategory.replace(/_/g, ' ')}</strong> have been flagged, proposing a tax demand of <strong>${formatINR(demandTax)}</strong> along with interest and penalty.
  </p>

  <p>
    At the threshold, the Taxpayer most respectfully submits that the allegations raised in the subject notice are unsustainable on facts as well as in law. The Taxpayer hereby places on record its point-by-point rebuttal, statutory reconciliations, and relevant judicial precedents with a humble prayer to drop the proceedings under Rule 99(3) of the CGST Rules, 2017.
  </p>

  <!-- 1. PRELIMINARY OBJECTIONS -->
  <h3>I. PRELIMINARY OBJECTIONS & FULFILLMENT OF SECTION 16(2)</h3>
  <p>
    ${preliminaryObjections || `1. The Assessee has strictly fulfilled all conditions precedents set forth under Section 16(2) of the CGST Act, 2017. The Assessee holds valid tax invoices issued by registered suppliers, has physically received the underlying goods/services along with valid e-way bills and delivery challans, and has fully discharged the consideration including tax via banking channels within the statutory 180-day limitation.`}
  </p>
  <p>
    2. Any variance between Form GSTR-2B and Form GSTR-3B for the period under scrutiny has arisen solely on account of timing differences, reporting in subsequent tax periods, or inadvertent clerical omissions by the registered suppliers in their respective Form GSTR-1, which were subsequently amended in terms of Section 37(3) of the CGST Act.
  </p>

  <!-- 2. FACTUAL REBUTTAL -->
  <h3>II. POINT-BY-POINT FACTUAL REBUTTAL & RECONCILIATION</h3>
  <div style="text-align: justify; line-height: 1.6; white-space: pre-line; margin-bottom: 12px;">
    ${factualRebuttal}
  </div>

  <!-- TABLE OF DISCREPANCY & RECONCILIATION -->
  <h3>ANNEXURE-A: INVOICE-WISE RECONCILIATION STATEMENT</h3>
  <table class="data-table">
    <thead>
      <tr>
        <th>Sr.</th>
        <th>Supplier Name & GSTIN</th>
        <th>Invoice No. & Date</th>
        <th>Taxable (₹)</th>
        <th>3B Claimed (₹)</th>
        <th>2B ITC (₹)</th>
        <th>Disputed ITC (₹)</th>
        <th>Reconciliation Reason & Status</th>
      </tr>
    </thead>
    <tbody>
      ${discrepancyItems
        .map(
          (item, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><strong>${item.supplier_name}</strong><br/><span style="font-family: monospace; font-size: 8.5pt;">${item.supplier_gstin}</span></td>
          <td>${item.invoice_number}<br/><span style="font-size: 8.5pt; color: #475569;">${item.invoice_date}</span></td>
          <td class="text-right">${formatINR(item.taxable_value)}</td>
          <td class="text-right">${formatINR(item.claimed_3b_itc)}</td>
          <td class="text-right">${formatINR(item.reflected_2b_itc)}</td>
          <td class="text-right" style="font-weight: bold; color: #b91c1c;">${formatINR(item.disputed_itc)}</td>
          <td style="font-size: 8.5pt;">${item.nature_of_mismatch}</td>
        </tr>
      `
        )
        .join('')}
      <tr style="background: #f1f5f9; font-weight: bold;">
        <td colspan="3" class="text-center">TOTALS</td>
        <td class="text-right">${formatINR(discrepancyItems.reduce((s, i) => s + i.taxable_value, 0))}</td>
        <td class="text-right">${formatINR(discrepancyItems.reduce((s, i) => s + i.claimed_3b_itc, 0))}</td>
        <td class="text-right">${formatINR(discrepancyItems.reduce((s, i) => s + i.reflected_2b_itc, 0))}</td>
        <td class="text-right" style="color: #b91c1c;">${formatINR(discrepancyItems.reduce((s, i) => s + i.disputed_itc, 0))}</td>
        <td class="text-center">Fully Explained</td>
      </tr>
    </tbody>
  </table>

  <!-- 3. STATUTORY PRECEDENTS -->
  <h3>III. JUDICIAL PRECEDENTS & LANDMARK HIGH COURT RULINGS</h3>
  <p>
    The Taxpayer places respectful reliance on authoritative decisions rendered by Constitutional Courts, which unequivocally govern the present controversy:
  </p>
  ${statutoryCitations
    .map(
      (c, i) => `
    <div class="citation-card">
      <div class="citation-title">${i + 1}. ${c.caseName} — ${c.court}</div>
      <div style="font-size: 9pt; color: #64748b; font-family: monospace;">Citation: ${c.citation}</div>
      <div class="citation-body">"${c.ratioDecidendi}"</div>
    </div>
  `
    )
    .join('')}

  <!-- 4. SECTION 50 INTEREST VERIFICATION -->
  <h3>IV. SECTION 50(1) & 50(3) INTEREST COMPUTATION VERIFICATION</h3>
  <p>
    The demand of statutory interest of <strong>${formatINR(demandInterest)}</strong> proposed in the notice is contrary to the statutory framework:
  </p>
  <ul>
    <li>
      <strong>Retrospective Amendment to Section 50(1):</strong> Inserted vide Finance Act, 2021 with retrospective effect from 01.07.2017. Interest is strictly payable on the <em>net tax liability paid through Electronic Cash Ledger</em>, and cannot be computed on gross tax liability.
    </li>
    <li>
      <strong>Section 50(3) read with Rule 88B(3) & Circular 192/04/2023-GST:</strong> Interest on wrongly availed Input Tax Credit is leviable <em>ONLY if such credit has been availed AND utilized</em>. In the instant case, the Assessee maintained a continuous closing credit balance in its Electronic Credit Ledger exceeding the disputed credit. Hence, no interest is legally payable.
    </li>
  </ul>

  <table class="data-table" style="max-width: 600px; margin-left: 20px;">
    <tr style="background: #f8fafc;">
      <th>Component</th>
      <th class="text-right">Department Allegation</th>
      <th class="text-right">Lawful Liability</th>
      <th class="text-right">Amount Disputed</th>
    </tr>
    <tr>
      <td>Tax Demand</td>
      <td class="text-right">${formatINR(demandTax)}</td>
      <td class="text-right">${formatINR(taxAccepted)}</td>
      <td class="text-right" style="font-weight: bold; color: #b91c1c;">${formatINR(taxDisputed)}</td>
    </tr>
    <tr>
      <td>Interest (Sec 50)</td>
      <td class="text-right">${formatINR(demandInterest)}</td>
      <td class="text-right">${formatINR(interestComputed)}</td>
      <td class="text-right" style="font-weight: bold; color: #b91c1c;">${formatINR(interestDisputed)}</td>
    </tr>
    <tr>
      <td>Penalty</td>
      <td class="text-right">${formatINR(demandPenalty)}</td>
      <td class="text-right">₹0.00</td>
      <td class="text-right" style="font-weight: bold; color: #b91c1c;">${formatINR(penaltyDisputed)}</td>
    </tr>
  </table>

  ${
    challanDetails?.arn
      ? `
    <div style="margin: 12px 0; padding: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; font-size: 10pt;">
      <strong>DRC-03 Voluntary Payment Acknowledgment:</strong><br/>
      Without prejudice to legal remedies, an amount of <strong>${formatINR(challanDetails.amount_paid || taxAccepted)}</strong> has been deposited under protest via <strong>ARN ${challanDetails.arn}</strong> dated ${challanDetails.payment_date || 'RECENT'}.
    </div>
  `
      : ''
  }

  <!-- PRAYER -->
  <h3>V. PRAYER</h3>
  <p>
    In light of the documentary substantiation, reconciliation statements, and authoritative judicial precedents cited herein, the Assessee most humbly prays that:
  </p>
  <ol style="margin-left: 20px; line-height: 1.6;">
    <li>The proposed demand of tax, interest, and penalty under Notice <strong>${noticeRefNo}</strong> be dropped in full;</li>
    <li>An order of acceptance of this reply in <strong>Form GST ASMT-12</strong> be issued under Rule 99(3) of the CGST Rules, 2017;</li>
    <li>In the unlikely event of any further clarification required, an opportunity of personal hearing under Section 75(4) of the CGST Act, 2017 be granted before taking any adverse decision.</li>
  </ol>

  <!-- VERIFICATION -->
  <div class="verification-box">
    <strong>VERIFICATION</strong>
    <p style="text-indent: 0; margin-top: 6px; font-size: 10.5pt;">
      I, <strong>${signatoryName}</strong>, holding the designation of <strong>${signatoryDesignation}</strong> of <strong>${clientName}</strong>, do hereby solemnly declare and verify that the contents of paragraphs I to V above and Annexure-A are true and correct to the best of my knowledge, information, and belief derived from the audited books of accounts and statutory returns.
    </p>
    <div style="margin-top: 14px; font-size: 10pt; color: #374151;">
      <div>Place: Mumbai, Maharashtra</div>
      <div>Date: ${replyDate}</div>
    </div>
  </div>

  <div class="signature-grid">
    <div>
      <div style="font-weight: bold; font-size: 10.5pt;">For ${clientName}</div>
      <div style="margin-top: 40px; border-top: 1px dashed #64748b; width: 220px; text-align: center; padding-top: 4px;">
        ${signatoryName}<br/>
        <span style="font-size: 9pt; color: #64748b;">${signatoryDesignation}</span>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: bold; font-size: 10.5pt;">Countersigned / Counsel</div>
      <div style="margin-top: 40px; border-top: 1px dashed #64748b; width: 220px; text-align: center; padding-top: 4px; margin-left: auto;">
        ${caFirmName}<br/>
        <span style="font-size: 9pt; color: #64748b;">Chartered Accountants</span>
      </div>
    </div>
  </div>

</body>
</html>`;

  return { htmlDocument, portalText };
}

/**
 * Fallback seed departmental scrutiny notices when database records are empty
 */
export function getFallbackDepartmentNotices(clientId: string): DepartmentNotice[] {
  return [
    {
      id: 'notice-seed-1',
      client_id: clientId,
      notice_reference_no: 'ZA270923018241F',
      notice_type: 'ASMT_10',
      financial_year: '2021-22',
      issue_date: '2023-10-18',
      due_date: '2023-11-17',
      demand_tax: 124500.0,
      demand_interest: 44820.0,
      demand_penalty: 12450.0,
      allegation_category: 'ITC_2B_VS_3B',
      status: 'Drafting Reply',
      issuing_authority: 'Superintendent of Central Tax, Range-IV, Division-II',
      jurisdiction_office: 'Mumbai Central Commissionerate',
      allegation_description:
        'Excess Input Tax Credit availed in Table 4(A)(5) of Form GSTR-3B over and above auto-drafted ITC available in Form GSTR-2B in terms of Section 16(2)(aa) of the CGST Act, 2017 read with Rule 36(4).',
      discrepancy_items: [
        {
          supplier_name: 'Gujarat Apex Petrochem Pvt Ltd',
          supplier_gstin: '24AAACH8765B1Z1',
          invoice_number: 'GAP/23-24/0981',
          invoice_date: '2021-11-14',
          taxable_value: 450000.0,
          claimed_3b_itc: 81000.0,
          reflected_2b_itc: 0.0,
          disputed_itc: 81000.0,
          nature_of_mismatch: 'Supplier omitted in GSTR-1 for Nov 2021; subsequently filed in Table 9 GSTR-1 in March 2022.',
          status: 'Timing_Difference',
        },
        {
          supplier_name: 'Shree Krishna Industrial Fasteners',
          supplier_gstin: '29AABCS6789R1Z8',
          invoice_number: 'SKF/2021/4412',
          invoice_date: '2022-01-20',
          taxable_value: 241666.67,
          claimed_3b_itc: 43500.0,
          reflected_2b_itc: 0.0,
          disputed_itc: 43500.0,
          nature_of_mismatch: 'Bonafide purchase with valid e-way bill & RTGS payment proof. Supplier GST registration subsequently suspended.',
          status: 'Cancelled_Vendor',
        },
      ],
    },
    {
      id: 'notice-seed-2',
      client_id: clientId,
      notice_reference_no: 'DRC01A/MUM/2023/8812',
      notice_type: 'DRC_01A',
      financial_year: '2022-23',
      issue_date: '2023-10-25',
      due_date: '2023-11-09',
      demand_tax: 68000.0,
      demand_interest: 18360.0,
      demand_penalty: 10000.0,
      allegation_category: 'GSTR_1_VS_3B',
      status: 'Under Review',
      issuing_authority: 'Deputy Commissioner of State Tax, Nodal-7',
      jurisdiction_office: 'Maharashtra State Goods and Services Tax Department',
      allegation_description:
        'Tax payable declared in Form GSTR-1 exceeds the output tax discharged in Form GSTR-3B for the month of August 2022, creating a tax shortfall under Section 73(1).',
      discrepancy_items: [
        {
          supplier_name: 'Acme Manufacturing Ltd (Internal Outward)',
          supplier_gstin: '27AAAAA0000A1Z5',
          invoice_number: 'INV/22-23/0411',
          invoice_date: '2022-08-14',
          taxable_value: 377777.78,
          claimed_3b_itc: 0.0,
          reflected_2b_itc: 0.0,
          disputed_itc: 68000.0,
          nature_of_mismatch: 'Credit note reported in GSTR-3B Table 3.1(a) as net turnover; GSTR-1 showed gross before adjustment.',
          status: 'Timing_Difference',
        },
      ],
    },
    {
      id: 'notice-seed-3',
      client_id: clientId,
      notice_reference_no: 'DRC01/MUM/2023/1042',
      notice_type: 'DRC_01',
      financial_year: '2020-21',
      issue_date: '2023-10-02',
      due_date: '2023-11-02',
      demand_tax: 215000.0,
      demand_interest: 96750.0,
      demand_penalty: 21500.0,
      allegation_category: 'CANCELLED_SUPPLIER',
      status: 'Partner Approved',
      issuing_authority: 'Assistant Commissioner of Central Tax, Division-I',
      jurisdiction_office: 'Mumbai South Commissionerate',
      allegation_description:
        'Show Cause Notice issued under Section 73 alleging ineligible ITC claimed on procurement from M/s Radiant Polymers whose GST registration was cancelled retroactively.',
      discrepancy_items: [
        {
          supplier_name: 'Radiant Polymers Industries',
          supplier_gstin: '27AABCR1234M1Z2',
          invoice_number: 'RPI/20-21/108',
          invoice_date: '2020-09-15',
          taxable_value: 1194444.44,
          claimed_3b_itc: 215000.0,
          reflected_2b_itc: 215000.0,
          disputed_itc: 215000.0,
          nature_of_mismatch: 'Vendor active on invoice date. Retrospective cancellation cannot prejudice bonafide purchaser (Suncraft Energies).',
          status: 'Cancelled_Vendor',
        },
      ],
    },
  ];
}
