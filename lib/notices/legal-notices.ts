/**
 * Automated Statutory Legal Notice Generator for GST Discrepancies
 * PROMPT 9: Generates formal, legally grounded discrepancy notices
 * referencing key sections of the CGST Act, 2017 and CGST Rules, 2017.
 */

import { DiscrepancyInvoice, formatINR, VendorCommunicationContext } from './email-templates';

export interface LegalNoticeDocument {
  referenceNumber: string;
  issueDate: string;
  clientName: string;
  clientGstin: string;
  clientAddress?: string;
  vendorName: string;
  vendorGstin: string;
  vendorAddress?: string;
  statutorySections: string[];
  totalClaimAmount: number;
  curePeriodDays: number;
  plainText: string;
  htmlDocument: string;
}

export function generateFormalLegalNotice(ctx: VendorCommunicationContext): LegalNoticeDocument {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const refNumber =
    ctx.referenceNumber ||
    `LEGAL/GST/SEC16/${ctx.periodYear}-${(ctx.periodYear + 1).toString().slice(-2)}/${Math.floor(
      1000 + Math.random() * 9000
    )}`;

  const cureDays = ctx.cureDays || 7;
  const caFirm = ctx.caFirmName || 'Kapur & Associates, Chartered Accountants';
  const totalTaxFormatted = formatINR(ctx.totalTaxAtRisk);
  const totalTaxable = ctx.invoices.reduce((sum, inv) => sum + (inv.booksTaxable || 0), 0);
  const totalTaxableFormatted = formatINR(totalTaxable);

  const statutorySections = [
    'Section 16(2)(aa) of the Central Goods and Services Tax Act, 2017',
    'Section 16(2)(c) of the Central Goods and Services Tax Act, 2017',
    'Rule 36(4) of the Central Goods and Services Tax Rules, 2017',
    'Section 37 read with Section 38 of the CGST Act, 2017',
    'Section 50(3) of the CGST Act, 2017 (Statutory Interest liability)',
    'Section 73 & Section 122 of the CGST Act, 2017',
  ];

  // Build rows for invoice table
  const invoiceRowsText = ctx.invoices
    .map(
      (inv, i) =>
        `${i + 1}. Inv #${inv.invoiceNumber} | Dt: ${inv.invoiceDate} | Taxable: ${formatINR(
          inv.booksTaxable
        )} | Tax at Risk: ${formatINR(inv.itcDiff)} | Reason: ${inv.reason}`
    )
    .join('\n');

  const invoiceRowsHtml = ctx.invoices
    .map(
      (inv, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px; font-family: monospace;">
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold;">${inv.invoiceNumber}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">${inv.invoiceDate}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">${formatINR(inv.booksTaxable)}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right;">${formatINR(inv.gstr2bTaxable)}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c; font-weight: bold;">${formatINR(
        inv.itcDiff
      )}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px;">${inv.reason}</td>
    </tr>
  `
    )
    .join('');

  const plainText = `BY SPEED POST A.D. & REGISTERED EMAIL
LEGAL NOTICE FOR RECTIFICATION OF GST DEFAULT & INDEMNITY DEMAND

Ref. No.: ${refNumber}
Date: ${formattedDate}

TO:
1. The Board of Directors / Partners
   M/s ${ctx.vendorName}
   GSTIN: ${ctx.vendorGstin}
   ${ctx.vendorAddress || 'Registered Commercial Address / Business Premises'}
   Email: ${ctx.vendorEmail || 'accounts@vendor.com'}

FROM:
${caFirm}
Chartered Accountants & Legal Tax Advisors
Representing: M/s ${ctx.clientName} (GSTIN: ${ctx.clientGstin})
${ctx.clientAddress || 'Registered Office Address'}

SUBJECT: FORMAL STATUTORY NOTICE UNDER SECTION 16(2)(aa) & 16(2)(c) OF THE CENTRAL GOODS AND SERVICES TAX ACT, 2017 READ WITH RULE 36(4) OF THE CGST RULES, 2017 FOR NON-REFLECTION / MISMATCH OF INPUT TAX CREDIT AGGREGATING TO ${totalTaxFormatted} ALONG WITH STATUTORY INTEREST AND COMMERCIAL INDEMNITY.

Sir / Madam,

Under instructions from and on behalf of our esteemed Client, M/s ${ctx.clientName}, having its Principal Place of Business with GSTIN: ${ctx.clientGstin} (hereinafter referred to as "Our Client"), we hereby serve upon you this Formal Statutory Notice in relation to your persistent failure to comply with the provisions of the Central Goods and Services Tax Act, 2017:

1. STATEMENT OF FACTS:
1.1 Our Client purchased taxable goods/services from your organization under various commercial invoices totaling Taxable Value of ${totalTaxableFormatted} on which applicable Goods and Services Tax of ${totalTaxFormatted} was charged by you.
1.2 Our Client has faithfully discharged its contractual obligation by making full and timely payment of the invoice consideration, including the entire GST amount charged therein, into your designated bank account.

2. STATUTORY DEFAULT & INFRACTION OF THE CGST ACT:
2.1 In terms of Section 37 of the CGST Act, 2017, you were legally obligated to furnish details of the outward supplies in your monthly GSTR-1 return on or before the 11th of the succeeding month.
2.2 Upon scrutiny of Our Client's auto-populated GSTR-2B statement generated under Section 38 of the CGST Act, it is revealed that ${ctx.invoices.length} invoice(s) issued by you do NOT reflect, or have been declared with substantial mismatches in value or tax heads.
2.3 The detailed particulars of the unreflected/discrepant invoices are set forth hereunder:
${invoiceRowsText}

3. LEGAL BAR UNDER SECTION 16(2)(aa) & SECTION 16(2)(c):
3.1 Pursuant to Section 16(2)(aa) of the CGST Act (w.e.f. 01-01-2022) read with Rule 36(4) of the CGST Rules, 2017, no registered person is permitted to avail Input Tax Credit unless the details of such invoice have been furnished by the supplier in GSTR-1 and communicated to the recipient in Form GSTR-2B.
3.2 Furthermore, under Section 16(2)(c), it is a condition precedent for ITC availment that the tax charged in respect of such supply has been actually paid to the Government Treasury. By collecting GST from Our Client and failing to properly file/remit the same, your organization has committed an illegal retention of public revenue, exposing Our Client to wrongful denial of credit.

4. ACCRUAL OF FINANCIAL LOSS & STATUTORY INTEREST:
4.1 Due to your unlawful default, Our Client has been deprived of working capital credit amounting to ${totalTaxFormatted}.
4.2 In the event of audit or scrutiny by the GST Department, any excess claim will attract mandatory statutory interest @ 18% per annum under Section 50(3) along with penalty under Section 73/74/122 of the Act. You are exclusively liable for all such consequential financial damages.

5. REQUISITION & DEMAND:
Our Client hereby calls upon you to:
(a) Forthwith rectify this default by uploading the aforementioned invoice(s) in Table 4A of your GSTR-1 (or Table 9A for amendments) in the upcoming filing cycle;
(b) Furnish the Application Reference Number (ARN) and filing acknowledgement to Our Client within ${cureDays} (Seven) days of receipt of this Notice;
(c) Indemnify Our Client for any interest, penalty, or loss of ITC suffered due to your default.

6. NOTICE OF COMMERCIAL LIEN & SET-OFF:
Please take note that if you fail to comply with the requisitions contained herein within ${cureDays} days:
- Our Client shall immediately exercise its contractual and equitable right of set-off by withholding and debiting ${totalTaxFormatted} plus 18% interest from any pending running bills, retention money, or security deposits payable to your entity;
- Our Client shall formally report this tax evasion/omission to the Jurisdictional GST Commissionerate & Anti-Evasion Cell;
- Our Client shall institute appropriate civil/commercial recovery proceedings before the competent Court of Law for damages, costs, and interest entirely at your risk and expense.

Yours faithfully,

For ${caFirm}
Chartered Accountants & Legal Tax Counsel
Authorized Signatory on behalf of M/s ${ctx.clientName}`;

  const htmlDocument = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Statutory Legal Notice - ${refNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; font-size: 11pt; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      .document-card { box-shadow: none !important; border: none !important; }
    }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #111827;
      line-height: 1.6;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
    }
    .document-card {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .header-bar {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .firm-name {
      font-size: 20px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .firm-sub {
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
    }
    .badge-speedpost {
      background-color: #0f172a;
      color: #ffffff;
      font-size: 11px;
      padding: 4px 8px;
      font-family: Arial, sans-serif;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .meta-table {
      width: 100%;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .meta-table td {
      vertical-align: top;
      padding: 4px 0;
    }
    .subject-box {
      background-color: #f1f5f9;
      border-left: 4px solid #0f172a;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: bold;
      margin: 20px 0;
      text-align: justify;
      line-height: 1.5;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 20px;
      margin-bottom: 8px;
      color: #0f172a;
      border-bottom: 1px dotted #cbd5e1;
      padding-bottom: 4px;
    }
    p {
      font-size: 13.5px;
      text-align: justify;
      margin: 10px 0;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .invoice-table th {
      background-color: #0f172a;
      color: #ffffff;
      padding: 8px 10px;
      font-size: 11px;
      text-align: left;
      border: 1px solid #0f172a;
    }
    .signatory-box {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="document-card">
    <div class="header-bar">
      <div>
        <div class="firm-name">${caFirm}</div>
        <div class="firm-sub">Chartered Accountants & Legal GST Advisory Practice</div>
        <div class="firm-sub">Representing Corporate Tax Clients across India</div>
      </div>
      <div style="text-align: right;">
        <span class="badge-speedpost">SPEED POST A.D. & EMAIL</span>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px; font-family: monospace;">Ref: ${refNumber}</div>
        <div style="font-size: 12px; color: #334155; margin-top: 2px;">Date: ${formattedDate}</div>
      </div>
    </div>

    <table class="meta-table">
      <tr>
        <td style="width: 50%;">
          <strong>TO:</strong><br/>
          <strong>The Board of Directors / Partners</strong><br/>
          <strong>M/s ${ctx.vendorName}</strong><br/>
          GSTIN: <span style="font-family: monospace;">${ctx.vendorGstin}</span><br/>
          ${ctx.vendorAddress || 'Registered Commercial Premises'}<br/>
          Email: <em>${ctx.vendorEmail || 'accounts@vendor.com'}</em>
        </td>
        <td style="width: 50%; padding-left: 20px;">
          <strong>ON INSTRUCTIONS OF:</strong><br/>
          <strong>M/s ${ctx.clientName}</strong><br/>
          GSTIN: <span style="font-family: monospace;">${ctx.clientGstin}</span><br/>
          ${ctx.clientAddress || 'Registered Office & Manufacturing Unit'}<br/>
          Email: <em>${ctx.clientEmail || 'tax@client.com'}</em>
        </td>
      </tr>
    </table>

    <div class="subject-box">
      SUBJECT: FORMAL STATUTORY NOTICE UNDER SECTION 16(2)(aa) & 16(2)(c) OF THE CENTRAL GOODS AND SERVICES TAX ACT, 2017 READ WITH RULE 36(4) OF THE CGST RULES, 2017 FOR NON-REFLECTION / MISMATCH OF INPUT TAX CREDIT OF ${totalTaxFormatted} WITH STATUTORY INTEREST LIABILITY AND DEMAND FOR IMMEDIATE RECTIFICATION.
    </div>

    <p>Sir / Madam,</p>

    <p>Under instructions from and on behalf of our client, <strong>M/s ${
      ctx.clientName
    }</strong> (GSTIN: ${
    ctx.clientGstin
  }), we hereby serve upon you this Formal Statutory Notice in consequence of your failure to report taxable transactions in your GSTR-1 returns, causing direct financial loss to Our Client.</p>

    <div class="section-title">1. Statement of Facts & Receipt of Consideration</div>
    <p>1.1 Our Client purchased taxable inward supplies from your organization under various commercial tax invoices totaling Taxable Value of <strong>${totalTaxableFormatted}</strong> with applicable GST of <strong>${totalTaxFormatted}</strong>.</p>
    <p>1.2 Our Client has punctually and fully paid the entire invoice amounts, including the tax component charged therein, into your designated bank account.</p>

    <div class="section-title">2. Statutory Default & Statement of Disputed Invoices</div>
    <p>2.1 In terms of Section 37 of the CGST Act, 2017, you were under statutory obligation to upload details of these supplies in your GSTR-1 return on or before the due date.</p>
    <p>2.2 Upon scrutiny of Our Client's auto-generated GSTR-2B statement, it is found that the following <strong>${
      ctx.invoices.length
    } invoice(s)</strong> have either been omitted entirely or reported with discrepancies in value/tax heads:</p>

    <table class="invoice-table">
      <thead>
        <tr>
          <th style="width: 5%; text-align: center;">#</th>
          <th style="width: 20%;">Invoice Number</th>
          <th style="width: 15%; text-align: center;">Date</th>
          <th style="width: 15%; text-align: right;">Books Taxable</th>
          <th style="width: 15%; text-align: right;">2B Taxable</th>
          <th style="width: 15%; text-align: right;">ITC at Risk</th>
          <th style="width: 15%;">Default Reason</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceRowsHtml}
      </tbody>
    </table>

    <div class="section-title">3. Infraction of Statutory Provisions & Loss of Input Tax Credit</div>
    <p>3.1 Pursuant to Section 16(2)(aa) of the CGST Act, 2017 (read with Rule 36(4)), Our Client cannot claim Input Tax Credit unless the details of the invoice are furnished by the supplier in GSTR-1 and communicated in GSTR-2B.</p>
    <p>3.2 Having accepted full GST payment from Our Client, your failure to report the transactions or deposit tax with the Government violates Section 16(2)(c) and constitutes unjust enrichment at the cost of Our Client.</p>
    <p>3.3 Your default exposes Our Client to statutory demand, recovery notices under Section 73/74, and mandatory interest @ 18% p.a. under Section 50(3) of the CGST Act.</p>

    <div class="section-title">4. Requisition & Demand for Rectification</div>
    <p>Our Client hereby demands that within <strong>${cureDays} (Seven) days</strong> of receipt of this notice, your organization must:</p>
    <ol style="font-size: 13px; margin: 8px 0 14px; padding-left: 24px;">
      <li>Report or amend the disputed invoices under Table 4A/Table 9A of your GSTR-1 return with recipient GSTIN <code>${ctx.clientGstin}</code>;</li>
      <li>Furnish the official Application Reference Number (ARN) and filing acknowledgement to Our Client; and</li>
      <li>Indemnify Our Client for any loss of credit, interest, or departmental litigation costs arising from this default.</li>
    </ol>

    <div class="section-title">5. Notice of Lien, Set-Off & Legal Action</div>
    <p>Please note that if this default is not remedied within the stipulated period of ${cureDays} days, Our Client shall forthwith <strong>exercise its legal right of set-off by withholding and debiting ${totalTaxFormatted} plus 18% statutory interest</strong> from your pending bills or retention money. In addition, formal complaints will be lodged with the Jurisdictional GST Commissionerate and civil recovery suits will be initiated at your sole risk and expense.</p>

    <div class="signatory-box">
      <div>
        <p style="font-size: 12px; color: #64748b; margin: 0;">Notice Served by Authorized Tax Counsel</p>
        <p style="font-size: 13px; font-weight: bold; margin: 4px 0 0;">${caFirm}</p>
        <p style="font-size: 12px; color: #475569; margin: 0;">Advocates & Chartered Accountants</p>
      </div>
      <div style="text-align: right;">
        <div style="width: 140px; border-bottom: 1px solid #94a3b8; margin-bottom: 4px;"></div>
        <p style="font-size: 12px; font-weight: bold; margin: 0;">Authorized Signatory</p>
        <p style="font-size: 11px; color: #64748b; margin: 0;">For and on behalf of M/s ${ctx.clientName}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return {
    referenceNumber: refNumber,
    issueDate: formattedDate,
    clientName: ctx.clientName,
    clientGstin: ctx.clientGstin,
    clientAddress: ctx.clientAddress,
    vendorName: ctx.vendorName,
    vendorGstin: ctx.vendorGstin,
    vendorAddress: ctx.vendorAddress,
    statutorySections,
    totalClaimAmount: ctx.totalTaxAtRisk,
    curePeriodDays: cureDays,
    plainText,
    htmlDocument,
  };
}
