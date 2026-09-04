import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AuditClientInfo {
  id: string;
  name: string;
  trade_name?: string;
  gstin: string;
  pan: string;
  state?: string;
  address?: string;
  constitution?: string;
}

export interface AuditFirmInfo {
  name: string;
  frn: string; // Firm Registration Number (e.g. 104523W)
  address: string;
  email: string;
  phone?: string;
  logoUrl?: string;
}

export interface AuditPartnerInfo {
  partnerName: string;
  membershipNumber: string; // e.g. FCA 124589
  firmRegNo: string;
  udin: string; // Unique Document Identification Number, e.g. 26124589AAAAAA9921
  signPlace: string;
  signDate: string;
  opinionType: 'Unqualified (True & Fair)' | 'Qualified (Subject to Discrepancies)' | 'Adverse';
  qualificationNotes?: string;
  legalDisclaimer: string;
}

export interface TurnoverReconSection {
  grossTurnoverBooks: number;
  unbilledRevenue: number;
  advancesReceived: number;
  creditNotesTimingDiff: number;
  exemptTurnover: number;
  adjustedTurnoverBooks: number;
  taxableTurnoverGstr1: number;
  turnoverDischargedGstr3b: number;
  unreconciledDifferenceGstr1VsBooks: number;
  unreconciledDifferenceGstr3bVs1: number;
  observations: string[];
}

export interface ItcReconSection {
  itcAsPerBooks: number;
  itcAsPerGstr2B: number;
  itcClaimedInGstr3B: number;
  ineligibleItcSection17_5: number;
  reversalRule42_43: number;
  netEligibleItc: number;
  itcTimingDifferenceBooksNextYear: number;
  itcIn2BNotAccounted: number;
  rule36_4RiskExposure: number; // Potential excess ITC claimed in 3B vs 2B
  observations: string[];
}

export interface ScrutinyNoticeSummary {
  notice_reference_no: string;
  notice_type: string; // e.g. ASMT-10, DRC-01, DRC-01A
  financial_year: string;
  issue_date: string;
  due_date: string;
  demand_tax: number;
  demand_interest: number;
  demand_penalty: number;
  allegation_category: string;
  status: string; // Pending Reply, Reply Filed, Dropped
  defense_strategy?: string;
}

export interface ScrutinyExposureSection {
  activeNoticesCount: number;
  totalDemandTax: number;
  totalDemandInterest: number;
  totalDemandPenalty: number;
  totalCumulativeExposure: number;
  noticesList: ScrutinyNoticeSummary[];
  statutoryDefenseNotes: string;
}

export interface AnnualDossierReportData {
  client: AuditClientInfo;
  firm: AuditFirmInfo;
  auditInfo: AuditPartnerInfo;
  financialYear: string;
  assessmentPeriod: string;
  generatedDate: string;
  dossierId: string;
  turnoverRecon: TurnoverReconSection;
  itcRecon: ItcReconSection;
  scrutinyExposure: ScrutinyExposureSection;
}

// Formatting helper for currency in INR
export function formatINR(val: number): string {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const formatted = absVal.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

// Generate default UDIN (Unique Document Identification Number) conforming to ICAI guidelines
export function generateSyntheticUDIN(membershipNo: string, year: string = '2026'): string {
  const yr = year.slice(-2);
  const cleanMem = membershipNo.replace(/[^0-9]/g, '').padEnd(6, '0').slice(0, 6);
  const randomChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 10; i++) {
    rand += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
  }
  return `${yr}${cleanMem}${rand}`;
}

/**
 * Primary PDF Generation Engine using jsPDF & jspdf-autotable
 */
export function generateAnnualDossierPDF(data: AnnualDossierReportData): jsPDF {
  // A4 size: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor: [number, number, number] = [30, 41, 59]; // slate-800
  const brandIndigo: [number, number, number] = [79, 70, 229]; // indigo-600
  const accentEmerald: [number, number, number] = [16, 149, 193]; // slate teal
  const alertRose: [number, number, number] = [225, 29, 72]; // rose-600
  const subtleBg: [number, number, number] = [248, 250, 252]; // slate-50
  const borderColor: [number, number, number] = [226, 232, 240]; // slate-200

  // -------------------------------------------------------------
  // HEADER & RUNNING FOOTER HELPER
  // -------------------------------------------------------------
  const applyRunningHeaderFooter = () => {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Running Header (from page 2 onwards)
      if (i > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(data.firm.name.toUpperCase(), margin, 10);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Annual GST Assessment Dossier — FY ${data.financialYear} | Client: ${data.client.name}`,
          pageWidth - margin,
          10,
          { align: 'right' }
        );
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.2);
        doc.line(margin, 12, pageWidth - margin, 12);
      }

      // Running Footer (on all pages)
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `CONFIDENTIAL & PRIVILEGED • UDIN: ${data.auditInfo.udin || 'PENDING'} • Generated on ${data.generatedDate}`,
        margin,
        pageHeight - 8
      );
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
        align: 'right',
      });
    }
  };

  // =============================================================
  // PAGE 1: COVER & EXECUTIVE ASSESSMENT SUMMARY
  // =============================================================
  let currentY = 16;

  // Firm Brand Top Box
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, contentWidth, 26, 2, 2, 'FD');

  // Firm Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text(data.firm.name, margin + 4, currentY + 7);

  // Firm Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Firm Registration No. (FRN): ${data.firm.frn || '108429W'} | Peer Reviewed Firm`,
    margin + 4,
    currentY + 12
  );
  doc.text(
    `${data.firm.address || 'Nariman Point, Mumbai - 400021'} | Email: ${data.firm.email}`,
    margin + 4,
    currentY + 17
  );

  // Right Side UDIN Badge
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(...brandIndigo);
  doc.roundedRect(pageWidth - margin - 58, currentY + 3, 54, 20, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...brandIndigo);
  doc.text('OFFICIAL UDIN ENDORSED', pageWidth - margin - 31, currentY + 8, { align: 'center' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(data.auditInfo.udin || '26108429AAAAAA9921', pageWidth - margin - 31, currentY + 14, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ICAI Self-Certification Sec 35(5)', pageWidth - margin - 31, currentY + 19, {
    align: 'center',
  });

  currentY += 32;

  // Title Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...primaryColor);
  doc.text('ANNUAL GST RECONCILIATION & AUDIT ASSESSMENT DOSSIER', margin, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Comprehensive Statutory Reconciliation Statement for GSTR-9 Annual Return & GSTR-9C Certification • Financial Year: ${data.financialYear}`,
    margin,
    currentY
  );

  currentY += 7;

  // Client Particulars Box (2-column layout)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, contentWidth, 28, 2, 2, 'FD');

  const col1X = margin + 5;
  const col2X = margin + (contentWidth / 2) + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TAXPAYER PARTICULARS', col1X, currentY + 6);
  doc.text('AUDIT & JURISDICTION DETAILS', col2X, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  // Col 1 details
  doc.text(`Legal Name:`, col1X, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.client.name}`, col1X + 22, currentY + 12);
  doc.setFont('helvetica', 'normal');

  doc.text(`Trade Name:`, col1X, currentY + 17);
  doc.text(`${data.client.trade_name || data.client.name}`, col1X + 22, currentY + 17);

  doc.text(`GSTIN / PAN:`, col1X, currentY + 22);
  doc.setFont('courier', 'bold');
  doc.text(`${data.client.gstin}  [${data.client.pan}]`, col1X + 22, currentY + 22);
  doc.setFont('helvetica', 'normal');

  // Col 2 details
  doc.text(`Financial Year:`, col2X, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.financialYear} (Assessment Year: 2026-27)`, col2X + 28, currentY + 12);
  doc.setFont('helvetica', 'normal');

  doc.text(`Audit Opinion:`, col2X, currentY + 17);
  doc.setFont('helvetica', 'bold');
  const isClean = data.auditInfo.opinionType.includes('Unqualified');
  doc.setTextColor(isClean ? 16 : 225, isClean ? 149 : 29, isClean ? 193 : 72);
  doc.text(`${data.auditInfo.opinionType}`, col2X + 28, currentY + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  doc.text(`Engagement CA:`, col2X, currentY + 22);
  doc.text(`${data.auditInfo.partnerName} (${data.auditInfo.membershipNumber})`, col2X + 28, currentY + 22);

  currentY += 34;

  // Executive Metric Highlight Cards (3-column cards)
  const cardW = (contentWidth - 8) / 3;
  const cardH = 21;

  // Card 1: Turnover Discrepancy
  const turnoverDiff = Math.abs(data.turnoverRecon.unreconciledDifferenceGstr1VsBooks);
  doc.setFillColor(turnoverDiff < 1000 ? 240 : 254, turnoverDiff < 1000 ? 253 : 242, turnoverDiff < 1000 ? 244 : 242);
  doc.setDrawColor(turnoverDiff < 1000 ? 187 : 254, turnoverDiff < 1000 ? 247 : 202, turnoverDiff < 1000 ? 208 : 202);
  doc.roundedRect(margin, currentY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TURNOVER VARIANCE (BOOKS vs G1)', margin + 3, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(turnoverDiff < 1000 ? 22 : 225, turnoverDiff < 1000 ? 101 : 29, turnoverDiff < 1000 ? 52 : 72);
  doc.text(formatINR(data.turnoverRecon.unreconciledDifferenceGstr1VsBooks), margin + 3, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    turnoverDiff < 1000 ? 'Reconciled within materiality' : 'Timing & Credit Note variations',
    margin + 3,
    currentY + 18
  );

  // Card 2: ITC Variance (GSTR-3B vs GSTR-2B)
  const itcGap = data.itcRecon.rule36_4RiskExposure;
  doc.setFillColor(itcGap <= 0 ? 240 : 254, itcGap <= 0 ? 253 : 242, itcGap <= 0 ? 244 : 242);
  doc.setDrawColor(itcGap <= 0 ? 187 : 254, itcGap <= 0 ? 247 : 202, itcGap <= 0 ? 208 : 202);
  doc.roundedRect(margin + cardW + 4, currentY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ITC COMPLIANCE GAP (3B vs 2B)', margin + cardW + 7, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(itcGap <= 0 ? 22 : 225, itcGap <= 0 ? 101 : 29, itcGap <= 0 ? 52 : 72);
  doc.text(formatINR(itcGap), margin + cardW + 7, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    itcGap <= 0 ? 'Full GSTR-2B backing available' : 'Rule 36(4) / Sec 16(2)(aa) Risk',
    margin + cardW + 7,
    currentY + 18
  );

  // Card 3: Departmental Scrutiny Exposure
  const totalScrutiny = data.scrutinyExposure.totalCumulativeExposure;
  doc.setFillColor(totalScrutiny === 0 ? 240 : 255, totalScrutiny === 0 ? 253 : 251, totalScrutiny === 0 ? 244 : 235);
  doc.setDrawColor(totalScrutiny === 0 ? 187 : 254, totalScrutiny === 0 ? 247 : 215, totalScrutiny === 0 ? 208 : 170);
  doc.roundedRect(margin + (cardW * 2) + 8, currentY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ACTIVE SCRUTINY EXPOSURE', margin + (cardW * 2) + 11, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(totalScrutiny === 0 ? 22 : 194, totalScrutiny === 0 ? 101 : 65, totalScrutiny === 0 ? 52 : 12);
  doc.text(formatINR(totalScrutiny), margin + (cardW * 2) + 11, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${data.scrutinyExposure.activeNoticesCount} Notices (ASMT-10/DRC-01)`,
    margin + (cardW * 2) + 11,
    currentY + 18
  );

  currentY += 26;

  // =============================================================
  // SECTION 1: TURNOVER RECONCILIATION TABLE (GSTR-9C TABLE 5/7)
  // =============================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text('1. TURNOVER RECONCILIATION STATEMENT (GSTR-9C TABLE 5 & 7 ALIGNED)', margin, currentY);

  currentY += 2;

  const turnoverTableRows = [
    [
      'A',
      'Gross Turnover as per Audited Financial Statements / P&L Books',
      formatINR(data.turnoverRecon.grossTurnoverBooks),
      'Statutory balance sheet audited revenue',
    ],
    [
      'B',
      '(+) Unbilled revenue / Timing additions at the beginning of FY',
      formatINR(data.turnoverRecon.unbilledRevenue),
      'Recognized for GST under Section 13/31',
    ],
    [
      'C',
      '(+) Advances received on which GST is liable (Taxable advances)',
      formatINR(data.turnoverRecon.advancesReceived),
      'Time of supply triggered on advance receipt',
    ],
    [
      'D',
      '(-) Credit Notes issued after year-end for FY supplies',
      formatINR(data.turnoverRecon.creditNotesTimingDiff),
      'Adjusted in Books post March',
    ],
    [
      'E',
      '(-) Exempted, Nil-rated, Non-GST outward turnover',
      formatINR(data.turnoverRecon.exemptTurnover),
      'Zero-rate / schedule III non-taxable',
    ],
    [
      'F',
      '(=) Adjusted Taxable Turnover as per Books of Accounts',
      formatINR(data.turnoverRecon.adjustedTurnoverBooks),
      'Base taxable turnover for GSTR-9C',
    ],
    [
      'G',
      'Outward Taxable Turnover declared in GSTR-1 filings',
      formatINR(data.turnoverRecon.taxableTurnoverGstr1),
      'Cumulative Table 4 + 5 + 6 of GSTR-1',
    ],
    [
      'H',
      'Turnover reported and Tax Discharged in GSTR-3B filings',
      formatINR(data.turnoverRecon.turnoverDischargedGstr3b),
      'Table 3.1(a) of monthly/quarterly 3B',
    ],
    [
      'I',
      'UNRECONCILED VARIANCE: GSTR-1 vs Adjusted Books [G - F]',
      formatINR(data.turnoverRecon.unreconciledDifferenceGstr1VsBooks),
      Math.abs(data.turnoverRecon.unreconciledDifferenceGstr1VsBooks) < 1000
        ? 'Fully Reconciled'
        : 'Differential requires GSTR-9 amendment',
    ],
    [
      'J',
      'UNRECONCILED TAX LIABILITY: GSTR-3B vs GSTR-1 [H - G]',
      formatINR(data.turnoverRecon.unreconciledDifferenceGstr3bVs1),
      Math.abs(data.turnoverRecon.unreconciledDifferenceGstr3bVs1) < 1000
        ? 'No Tax Gap'
        : 'Discharge through DRC-03 required',
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Sr.', 'Turnover Particulars / Statutory Head', 'Amount (INR)', 'Audit Remarks']],
    body: turnoverTableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 42, textColor: [100, 116, 139] },
    },
    didParseCell: (dataCell) => {
      // Highlight total rows F, I, J
      if (dataCell.row.index === 5 || dataCell.row.index === 8 || dataCell.row.index === 9) {
        dataCell.cell.styles.fillColor = [241, 245, 249];
        dataCell.cell.styles.fontStyle = 'bold';
        if (dataCell.row.index === 8 && Math.abs(data.turnoverRecon.unreconciledDifferenceGstr1VsBooks) > 1000) {
          dataCell.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
  });

  // Observations / CA Notes for Turnover
  let finalYAfterTurnover = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Key Turnover Audit Observations:', margin, finalYAfterTurnover);
  finalYAfterTurnover += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  data.turnoverRecon.observations.forEach((obs) => {
    doc.text(`• ${obs}`, margin + 2, finalYAfterTurnover);
    finalYAfterTurnover += 3.2;
  });

  // =============================================================
  // PAGE 2: ITC RECONCILIATION & SCRUTINY RISK EXPOSURE
  // =============================================================
  doc.addPage();
  currentY = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text('2. INPUT TAX CREDIT (ITC) RECONCILIATION (BOOKS vs GSTR-2B vs GSTR-3B)', margin, currentY);

  currentY += 2;

  const itcTableRows = [
    [
      'A',
      'Gross ITC availed as per Books of Accounts (Purchase Register)',
      formatINR(data.itcRecon.itcAsPerBooks),
      'Accounted in ERP / Tally ledger',
    ],
    [
      'B',
      'Auto-populated Eligible ITC available in GSTR-2B (Statement)',
      formatINR(data.itcRecon.itcAsPerGstr2B),
      'Section 16(2)(aa) statutory ceiling',
    ],
    [
      'C',
      'Total ITC Claimed in Table 4(A) of GSTR-3B',
      formatINR(data.itcRecon.itcClaimedInGstr3B),
      'Actual credit utilized / credited to ledger',
    ],
    [
      'D',
      '(-) Ineligible ITC reversed under Section 17(5) (Blocked Credit)',
      formatINR(data.itcRecon.ineligibleItcSection17_5),
      'Motor vehicles, food, personal supplies',
    ],
    [
      'E',
      '(-) Reversals under Rule 42 & Rule 43 (Common credit ratio)',
      formatINR(data.itcRecon.reversalRule42_43),
      'Proportionate exempt outward reversal',
    ],
    [
      'F',
      '(=) Net Eligible ITC Retained as per Table 4(C) of GSTR-3B',
      formatINR(data.itcRecon.netEligibleItc),
      'Net credited to electronic credit ledger',
    ],
    [
      'G',
      'ITC in Books but Supplier uploaded late (Availed in subsequent period)',
      formatINR(data.itcRecon.itcTimingDifferenceBooksNextYear),
      'Valid invoice held; Section 16(4) window',
    ],
    [
      'H',
      'ITC available in GSTR-2B but not accounted in Books (Unclaimed)',
      formatINR(data.itcRecon.itcIn2BNotAccounted),
      'Eligible credit available to be claimed',
    ],
    [
      'I',
      'RULE 36(4) COMPLIANCE EXPOSURE: Excess 3B Claim vs GSTR-2B [C - B]',
      formatINR(data.itcRecon.rule36_4RiskExposure),
      data.itcRecon.rule36_4RiskExposure > 0
        ? 'High Audit Risk: Section 73 recovery risk'
        : 'Zero Exposure: 100% 2B matched',
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Sr.', 'ITC Reconciliation Particulars / Legal Category', 'Amount (INR)', 'Compliance Status']],
    body: itcTableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 42, textColor: [100, 116, 139] },
    },
    didParseCell: (dataCell) => {
      if (dataCell.row.index === 5 || dataCell.row.index === 8) {
        dataCell.cell.styles.fillColor = [241, 245, 249];
        dataCell.cell.styles.fontStyle = 'bold';
        if (dataCell.row.index === 8 && data.itcRecon.rule36_4RiskExposure > 0) {
          dataCell.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
  });

  // ITC Observations
  let finalYAfterITC = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Input Tax Credit Audit Observations:', margin, finalYAfterITC);
  finalYAfterITC += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  data.itcRecon.observations.forEach((obs) => {
    doc.text(`• ${obs}`, margin + 2, finalYAfterITC);
    finalYAfterITC += 3.2;
  });

  currentY = finalYAfterITC + 4;

  // =============================================================
  // SECTION 3: DEPARTMENTAL SCRUTINY & RISK EXPOSURE (ASMT-10 / DRC-01)
  // =============================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text('3. ACTIVE DEPARTMENTAL SCRUTINY & STATUTORY RISK EXPOSURE', margin, currentY);

  currentY += 2;

  const scrutinyRows = data.scrutinyExposure.noticesList.map((n) => [
    n.notice_reference_no,
    n.notice_type,
    n.allegation_category,
    formatINR(n.demand_tax),
    formatINR(n.demand_interest + n.demand_penalty),
    formatINR(n.demand_tax + n.demand_interest + n.demand_penalty),
    n.status,
  ]);

  if (scrutinyRows.length === 0) {
    scrutinyRows.push([
      'N/A',
      'Clean',
      'No active departmental notices under ASMT-10, DRC-01, or DRC-01A',
      '₹0.00',
      '₹0.00',
      '₹0.00',
      'Zero Exposure',
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Notice Ref.', 'Type', 'Allegation Category', 'Tax (INR)', 'Int & Pen', 'Total Exposure', 'Status']],
    body: scrutinyRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 50 },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 20, halign: 'center' },
    },
  });

  let finalYAfterScrutiny = (doc as any).lastAutoTable.finalY + 4;

  // Cumulative Scrutiny Bar
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, finalYAfterScrutiny, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text(
    `Total Scrutiny Exposure: ${formatINR(data.scrutinyExposure.totalCumulativeExposure)} (Tax: ${formatINR(
      data.scrutinyExposure.totalDemandTax
    )} | Accrued Sec 50 Interest: ${formatINR(
      data.scrutinyExposure.totalDemandInterest
    )} | Penalty: ${formatINR(data.scrutinyExposure.totalDemandPenalty)})`,
    margin + 3,
    finalYAfterScrutiny + 5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(185, 28, 28);
  doc.text(
    `Statutory Defense Position: ${data.scrutinyExposure.statutoryDefenseNotes}`,
    margin + 3,
    finalYAfterScrutiny + 9.5
  );

  // =============================================================
  // PAGE 3: PARTNER SIGN-OFF & GSTR-9C CERTIFICATION STATEMENT
  // =============================================================
  doc.addPage();
  currentY = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text('4. CHARTERED ACCOUNTANT CERTIFICATION & SIGN-OFF (RULE 80(3))', margin, currentY);

  currentY += 6;

  // Verification Paragraphs
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const certText1 = `I/We have examined the balance sheet, profit and loss account for the financial year ${data.financialYear}, the periodic returns in Form GSTR-1, GSTR-2B, and GSTR-3B, and the relevant registers and records of M/s ${data.client.name} (GSTIN: ${data.client.gstin}). In our opinion and to the best of our information and according to explanations given to us, the particulars given in the Annual GST Reconciliation Statement are true and fair, subject to the qualifications specified hereunder:`;

  const splitCert1 = doc.splitTextToSize(certText1, contentWidth);
  doc.text(splitCert1, margin, currentY);
  currentY += splitCert1.length * 4 + 2;

  // Qualification Notes Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Audit Qualifications & Material Observations:', margin + 3, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const qualNotes =
    data.auditInfo.qualificationNotes ||
    '1. ITC claimed in GSTR-3B has been reconciled with GSTR-2B; discrepancies identified are reported in Table 2.\n2. Turnover reported in GSTR-1 matches audited books subject to timing additions.\n3. Departmental notices under Section 61/73 are actively defended with appropriate statutory precedents.';
  const splitQual = doc.splitTextToSize(qualNotes, contentWidth - 6);
  doc.text(splitQual, margin + 3, currentY + 10);

  currentY += 30;

  // Legal Disclaimer Box
  doc.setFillColor(254, 252, 232); // amber-50
  doc.setDrawColor(254, 240, 138); // amber-200
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(161, 98, 7);
  doc.text('Statutory Legal Disclaimer & Limitation of Liability:', margin + 3, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(180, 83, 9);
  const disclaimer =
    data.auditInfo.legalDisclaimer ||
    'This reconciliation dossier is prepared solely for the internal use of the client and statutory filing of GSTR-9 and GSTR-9C under the Central Goods and Services Tax Act, 2017. Our verification is based on the books of account and electronic data provided by the management. No liability is accepted to any third party for decisions made based on this document.';
  const splitDisc = doc.splitTextToSize(disclaimer, contentWidth - 6);
  doc.text(splitDisc, margin + 3, currentY + 9.5);

  currentY += 28;

  // Signature Block & Stamp Box (2-column layout)
  const signColW = (contentWidth - 6) / 2;

  // Left: Place & Date
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, signColW, 44, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('ENGAGEMENT VERIFICATION DETAILS', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Place of Verification: ${data.auditInfo.signPlace || 'Mumbai'}`, margin + 4, currentY + 14);
  doc.text(`Date of Endorsement: ${data.auditInfo.signDate || data.generatedDate}`, margin + 4, currentY + 20);
  doc.text(`Engagement Role: Statutory GST Auditor`, margin + 4, currentY + 26);
  doc.text(`Audit Opinion: ${data.auditInfo.opinionType}`, margin + 4, currentY + 32);

  // Right: CA Partner Signature & Stamp Box
  const rightSignX = margin + signColW + 6;
  doc.setDrawColor(...brandIndigo);
  doc.roundedRect(rightSignX, currentY, signColW, 44, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...brandIndigo);
  doc.text('FOR AND ON BEHALF OF:', rightSignX + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text(data.firm.name, rightSignX + 4, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Chartered Accountants | FRN: ${data.firm.frn || '108429W'}`, rightSignX + 4, currentY + 17);

  // Simulated CA Seal / Signature Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(rightSignX + 4, currentY + 28, rightSignX + signColW - 4, currentY + 28);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(data.auditInfo.partnerName, rightSignX + 4, currentY + 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Partner • Membership No: ${data.auditInfo.membershipNumber}`, rightSignX + 4, currentY + 37);

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...brandIndigo);
  doc.text(`UDIN: ${data.auditInfo.udin || 'PENDING'}`, rightSignX + 4, currentY + 41);

  // Apply running headers & footers across all generated pages
  applyRunningHeaderFooter();

  return doc;
}

/**
 * Helper to download PDF directly in the browser
 */
export function downloadAnnualDossierPDF(data: AnnualDossierReportData, customFilename?: string): void {
  const doc = generateAnnualDossierPDF(data);
  const cleanName = data.client.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = customFilename || `GST_Audit_Dossier_FY${data.financialYear}_${cleanName}.pdf`;
  doc.save(filename);
}

/**
 * Helper to get PDF as Data URL or Blob for embedded in-app preview
 */
export function getAnnualDossierPDFDataUri(data: AnnualDossierReportData): string {
  const doc = generateAnnualDossierPDF(data);
  return doc.output('datauristring');
}
