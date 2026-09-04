/**
 * Automated Vendor Communication & Discrepancy Email Templates
 * PROMPT 9: Generates professional email drafts for vendors when their invoices
 * show tax/value mismatches or are missing from GSTR-2B.
 */

export interface DiscrepancyInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  booksTaxable: number;
  gstr2bTaxable: number;
  booksItc: number;
  gstr2bItc: number;
  taxableDiff: number;
  itcDiff: number;
  discrepancyType: 'missing_in_2b' | 'value_mismatch' | 'tax_head_mismatch' | 'missing_in_books';
  reason: string;
}

export interface VendorCommunicationContext {
  clientName: string;
  clientGstin: string;
  clientTradeName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  vendorName: string;
  vendorGstin: string;
  vendorEmail?: string;
  vendorAddress?: string;
  periodMonth: number;
  periodYear: number;
  invoices: DiscrepancyInvoice[];
  totalTaxAtRisk: number;
  caFirmName?: string;
  caCounselName?: string;
  cureDays?: number;
  referenceNumber?: string;
}

export interface GeneratedEmailDraft {
  subject: string;
  plainText: string;
  htmlText: string;
  templateType: 'email_advisory' | 'urgent_reminder' | 'settlement_demand';
  totalTaxAtRisk: number;
  invoicesCount: number;
  suggestedRecipient: string;
}

const MONTH_NAMES = [
  '',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(val || 0);
}

/**
 * Generate a text-based ASCII table of disputed invoices for emails
 */
function generateAsciiTable(invoices: DiscrepancyInvoice[]): string {
  if (!invoices || invoices.length === 0) return 'No invoice details available.';

  const header = `| Invoice No.     | Date       | Books Taxable | GSTR-2B Taxable | Disallowed ITC | Issue Description             |
|-----------------|------------|---------------|-----------------|----------------|-------------------------------|`;

  const rows = invoices.map((inv) => {
    const invNo = inv.invoiceNumber.padEnd(15).slice(0, 15);
    const date = inv.invoiceDate.padEnd(10).slice(0, 10);
    const bTax = formatINR(inv.booksTaxable).padStart(13);
    const gTax = formatINR(inv.gstr2bTaxable).padStart(15);
    const itcDiff = formatINR(inv.itcDiff).padStart(14);
    const issue = inv.reason.padEnd(29).slice(0, 29);
    return `| ${invNo} | ${date} | ${bTax} | ${gTax} | ${itcDiff} | ${issue} |`;
  });

  return `${header}\n${rows.join('\n')}`;
}

/**
 * Generate an HTML table of disputed invoices for rich email clients
 */
function generateHtmlTable(invoices: DiscrepancyInvoice[]): string {
  if (!invoices || invoices.length === 0) return '<p>No invoice details available.</p>';

  const rowHtml = invoices
    .map(
      (inv, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${inv.invoiceNumber}</td>
      <td style="padding: 10px 12px; color: #475569;">${inv.invoiceDate}</td>
      <td style="padding: 10px 12px; text-align: right; color: #334155;">${formatINR(inv.booksTaxable)}</td>
      <td style="padding: 10px 12px; text-align: right; color: #334155;">${formatINR(inv.gstr2bTaxable)}</td>
      <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #dc2626;">${formatINR(inv.itcDiff)}</td>
      <td style="padding: 10px 12px; color: #64748b; font-size: 13px;">${inv.reason}</td>
    </tr>
  `
    )
    .join('');

  return `
    <table style="width: 100%; border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; margin: 16px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
      <thead>
        <tr style="background-color: #0f172a; color: #ffffff; text-align: left;">
          <th style="padding: 12px; font-weight: 600;">Invoice No.</th>
          <th style="padding: 12px; font-weight: 600;">Date</th>
          <th style="padding: 12px; font-weight: 600; text-align: right;">Books Taxable</th>
          <th style="padding: 12px; font-weight: 600; text-align: right;">GSTR-2B Taxable</th>
          <th style="padding: 12px; font-weight: 600; text-align: right;">ITC Difference</th>
          <th style="padding: 12px; font-weight: 600;">Issue Reason</th>
        </tr>
      </thead>
      <tbody>
        ${rowHtml}
      </tbody>
    </table>
  `;
}

/**
 * 1. Professional Advisory Email (First Reminder / Friendly Reconciliation Notice)
 */
export function generateAdvisoryEmail(ctx: VendorCommunicationContext): GeneratedEmailDraft {
  const periodStr = `${MONTH_NAMES[ctx.periodMonth]} ${ctx.periodYear}`;
  const totalRiskStr = formatINR(ctx.totalTaxAtRisk);
  const caFirm = ctx.caFirmName || 'Tax & Compliance Team';
  const asciiTable = generateAsciiTable(ctx.invoices);
  const htmlTable = generateHtmlTable(ctx.invoices);

  const subject = `GST Reconciliation Advisory: Discrepancy in GSTR-2B for ${periodStr} | ${ctx.clientName}`;

  const plainText = `Dear ${ctx.vendorName} Accounts & Taxation Team,

Greetings from the Tax & Compliance Division on behalf of ${ctx.clientName} (GSTIN: ${ctx.clientGstin}).

During our routine statutory GST reconciliation for the tax period ${periodStr}, we observed that ${ctx.invoices.length} invoice(s) issued by your organization are either missing from our client's auto-drafted GSTR-2B statement or have value/tax-head mismatches.

As per Section 16(2)(aa) of the Central Goods and Services Tax Act, 2017 (read with Rule 36(4) of the CGST Rules), our client is statutorily prohibited from availing Input Tax Credit (ITC) on inward supplies unless the corresponding supplier has duly furnished the details in their GSTR-1 / Invoice Furnishing Facility (IFF) and the same reflects in our client's GSTR-2B.

SUMMARY OF INVOICE DISCREPANCIES:
Total ITC currently at risk: ${totalRiskStr}
Number of affected invoices: ${ctx.invoices.length}

${asciiTable}

ACTION REQUESTED:
1. GSTR-1 Verification: Please verify whether the above-listed invoices were reported under Table 4A (B2B regular supplies) in your GSTR-1 for ${periodStr} with the correct buyer GSTIN (${ctx.clientGstin}).
2. Timely Rectification: If any invoice was inadvertently omitted or reported with incorrect values/tax heads, kindly amend or report it in your next monthly GSTR-1 filing (or Table 9A amendment) prior to the statutory cutoff date (11th of the month).
3. Credit Note / Debit Note: If any credit or debit notes have been issued against these invoices, please furnish the corresponding filing details (ARN and date).

Please share the filing confirmation or your reconciliation remarks within 5 business days by replying to this email at ${ctx.clientEmail || 'compliance@client.com'}.

Your prompt cooperation is greatly appreciated to avoid ITC disallowance and unnecessary tax disputes.

Warm regards,

GST Compliance & Tax Advisory Cell
On behalf of: ${ctx.clientName} (GSTIN: ${ctx.clientGstin})
Firm / Tax Consultant: ${caFirm}
Ref: ${ctx.referenceNumber || `DISP/${ctx.periodYear}/${ctx.periodMonth}-${Math.floor(1000 + Math.random() * 9000)}`}`;

  const htmlText = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 20px;">GST Reconciliation & ITC Advisory</h2>
        <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Issued on behalf of <strong>${ctx.clientName}</strong> (GSTIN: <span style="font-family: monospace;">${ctx.clientGstin}</span>)</p>
      </div>

      <p>Dear <strong>${ctx.vendorName}</strong> Accounts & Taxation Team,</p>

      <p>During our routine statutory GST reconciliation for <strong>${periodStr}</strong>, our compliance team identified that <strong>${ctx.invoices.length} invoice(s)</strong> issued by your organization are either missing in our client's GSTR-2B statement or have value/tax-head discrepancies.</p>

      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; color: #991b1b;">
          <strong>Statutory Bar under Section 16(2)(aa) of CGST Act, 2017:</strong><br/>
          Recipients are statutorily prohibited from claiming Input Tax Credit unless the supplier has uploaded the invoice in their GSTR-1/IFF and it reflects in the recipient's GSTR-2B. Currently, <strong>${totalRiskStr}</strong> of legitimate ITC is blocked.
        </p>
      </div>

      <h3 style="font-size: 15px; color: #0f172a; margin: 24px 0 8px;">Schedule of Discrepant Invoices:</h3>
      ${htmlTable}

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px; color: #0f172a; font-size: 14px;">Immediate Steps Required:</h4>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
          <li style="margin-bottom: 6px;"><strong>Check GSTR-1:</strong> Confirm whether invoices were filed under Table 4A with buyer GSTIN <code>${ctx.clientGstin}</code>.</li>
          <li style="margin-bottom: 6px;"><strong>Amend in Next Filing:</strong> Amend discrepancies in your upcoming GSTR-1 return (or Table 9A) before the 11th of the month.</li>
          <li><strong>Confirmation:</strong> Send the ARN / filing confirmation to <em>${ctx.clientEmail || 'compliance@client.com'}</em> within 5 working days.</li>
        </ol>
      </div>

      <p style="font-size: 13px; color: #475569;">Thank you for your prompt attention to this matter.</p>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #64748b;">
        <p style="margin: 0;"><strong>GST Compliance & Tax Advisory Division</strong></p>
        <p style="margin: 2px 0;">Representing: ${ctx.clientName} | CA Advisor: ${caFirm}</p>
        <p style="margin: 2px 0;">Ref Code: ${ctx.referenceNumber || `DISP/${ctx.periodYear}/${ctx.periodMonth}`}</p>
      </div>
    </div>
  `;

  return {
    subject,
    plainText,
    htmlText,
    templateType: 'email_advisory',
    totalTaxAtRisk: ctx.totalTaxAtRisk,
    invoicesCount: ctx.invoices.length,
    suggestedRecipient: ctx.vendorEmail || 'accounts@vendor.com',
  };
}

/**
 * 2. Urgent Reminder Email (Prior to GSTR-3B cutoff / Payment Withholding Warning)
 */
export function generateUrgentReminderEmail(ctx: VendorCommunicationContext): GeneratedEmailDraft {
  const periodStr = `${MONTH_NAMES[ctx.periodMonth]} ${ctx.periodYear}`;
  const totalRiskStr = formatINR(ctx.totalTaxAtRisk);
  const cureDays = ctx.cureDays || 5;
  const caFirm = ctx.caFirmName || 'Chartered Accountants & Legal Advisors';
  const asciiTable = generateAsciiTable(ctx.invoices);
  const htmlTable = generateHtmlTable(ctx.invoices);

  const subject = `URGENT: Blocked GST ITC Risk of ${totalRiskStr} - Missing/Mismatched Invoices in GSTR-2B | ${ctx.clientName}`;

  const plainText = `URGENT & TIME SENSITIVE NOTICE

To: Accounts Head / Taxation Manager
${ctx.vendorName} (GSTIN: ${ctx.vendorGstin})

From: Tax Compliance & Legal Advisory Unit
On behalf of: ${ctx.clientName} (GSTIN: ${ctx.clientGstin})
Ref: ${ctx.referenceNumber || `URGENT/GST/${ctx.periodYear}/${ctx.periodMonth}`}

Dear Sir/Madam,

This is a formal and urgent follow-up regarding our previous communication concerning ${ctx.invoices.length} unreflected invoice(s) for the tax period ${periodStr}, aggregating to a total Input Tax Credit at risk of ${totalRiskStr}.

As our client's statutory GSTR-3B return filing date is imminent, non-reflection of these invoices in GSTR-2B will result in permanent disallowance of ITC under Section 16(2)(aa) of the CGST Act. Furthermore, if our client is forced to bear this tax loss, financial damage including interest at 18% p.a. under Section 50(3) will occur.

DETAILS OF DISPUTED TRANSACTIONS:
${asciiTable}

COMMERCIAL & LEGAL IMPLICATIONS:
Please be advised that under the terms of our business agreement and Indian GST jurisprudence:
1. Payment of the tax component (or future invoice disbursement) amounting to ${totalRiskStr} will be temporarily withheld / placed in debit hold until these invoices reflect in GSTR-2B.
2. If this default triggers a notice from GST Authorities under Section 73/74, ${ctx.vendorName} shall be held solely liable to indemnify ${ctx.clientName} for all consequential tax, interest, and penalties.

REQUIRED IMMEDIATE ACTION WITHIN ${cureDays} DAYS:
- Furnish proof of GSTR-1 filing (ARN) showing these invoices under recipient GSTIN ${ctx.clientGstin}.
- Alternatively, provide written confirmation that Table 9A amendment will be uploaded in the upcoming return cycle.

Please respond immediately to prevent commercial holds on vendor accounts.

Sincerely,

Tax & Legal Advisory Department
On behalf of: ${ctx.clientName}
Authorized CA Practice: ${caFirm}`;

  const htmlText = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ef4444; color: #ffffff; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px;">Urgent: Blocked ITC & Payment Hold Notice</h2>
        <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Statutory Compliance Alert for ${periodStr} | Total Exposure: ${totalRiskStr}</p>
      </div>

      <p>To: <strong>Accounts Head / Taxation Department</strong><br/>
      <strong>${ctx.vendorName}</strong> (GSTIN: <span style="font-family: monospace;">${ctx.vendorGstin}</span>)</p>

      <p>This is an urgent communication on behalf of <strong>${ctx.clientName}</strong> (GSTIN: <span style="font-family: monospace;">${ctx.clientGstin}</span>). The monthly statutory return filing deadline is approaching and <strong>${ctx.invoices.length} invoice(s)</strong> totaling <strong>${totalRiskStr}</strong> remain missing from GSTR-2B.</p>

      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 14px 18px; margin: 18px 0;">
        <h4 style="margin: 0 0 6px; color: #9f1239; font-size: 14px;">Commercial & Ledger Notice:</h4>
        <p style="margin: 0; font-size: 13px; color: #881337;">
          Pursuant to Section 16(2)(aa) & 16(2)(c) of the CGST Act, 2017, failure to reflect these invoices forces our client to fund this tax from their own working capital. Consequently, <strong>our client's finance desk will hold further disbursements or set off the disputed tax value of ${totalRiskStr}</strong> against pending account balances until the filing is rectified.
        </p>
      </div>

      <h3 style="font-size: 14px; color: #0f172a; margin: 20px 0 8px;">Schedule of Defaulted Invoices:</h3>
      ${htmlTable}

      <p style="font-size: 13px;">Kindly furnish filing proof (ARN) or amendment confirmation within <strong>${cureDays} days</strong> to avoid ledger holds and formal statutory notices.</p>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #64748b;">
        <p style="margin: 0;"><strong>Tax Compliance & Legal Counsel</strong></p>
        <p style="margin: 2px 0;">Representing: ${ctx.clientName} | ${caFirm}</p>
      </div>
    </div>
  `;

  return {
    subject,
    plainText,
    htmlText,
    templateType: 'urgent_reminder',
    totalTaxAtRisk: ctx.totalTaxAtRisk,
    invoicesCount: ctx.invoices.length,
    suggestedRecipient: ctx.vendorEmail || 'finance@vendor.com',
  };
}

/**
 * 3. Formal Settlement Demand (Pre-Notice Letter)
 */
export function generateSettlementDemandEmail(ctx: VendorCommunicationContext): GeneratedEmailDraft {
  const periodStr = `${MONTH_NAMES[ctx.periodMonth]} ${ctx.periodYear}`;
  const totalRiskStr = formatINR(ctx.totalTaxAtRisk);
  const cureDays = ctx.cureDays || 7;
  const caFirm = ctx.caFirmName || 'Kapur & Associates, Chartered Accountants';

  const subject = `FORMAL DEMAND FOR RECTIFICATION OF UNREFLECTED GST ITC - ${totalRiskStr} | ${ctx.clientName} vs ${ctx.vendorName}`;

  const plainText = `FORMAL DEMAND NOTICE PRIOR TO STATUTORY RECOVERY PROCEEDINGS

Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
Ref No.: ${ctx.referenceNumber || `LEGAL/GST/DEMAND/${ctx.periodYear}/${Math.floor(100000 + Math.random() * 900000)}`}

To:
The Board of Directors / Authorized Signatory
${ctx.vendorName}
GSTIN: ${ctx.vendorGstin}

From:
${caFirm}, Chartered Accountants & Legal Tax Advisors
On behalf of: ${ctx.clientName} (GSTIN: ${ctx.clientGstin})

SUBJECT: DEMAND FOR IMMEDIATE AMENDMENT / FILING IN GSTR-1 FOR RECTIFICATION OF UNREFLECTED INPUT TAX CREDIT AMOUNTING TO ${totalRiskStr} UNDER SECTION 16(2)(aa) & 16(2)(c) OF THE CGST ACT, 2017

Dear Sir / Madam,

Under instructions from and on behalf of our client, ${ctx.clientName}, we hereby serve upon you this Formal Demand Notice:

1. OUR CLIENT HAS FULLY PAID THE INVOICE AMOUNTS INCLUDING TAX:
Our client duly remitted the complete consideration including GST for ${ctx.invoices.length} invoice(s) totaling ${formatINR(ctx.invoices.reduce((a, b) => a + b.booksTaxable, 0))} taxable value and ${totalRiskStr} GST.

2. STATUTORY DEFAULT BY YOUR ENTITY:
Despite receiving payment, your company has failed to furnish the particulars in GSTR-1 as mandated under Section 37 of the CGST Act, 2017, causing these supplies to be omitted from our client's GSTR-2B.

3. LOSS CAUSED TO OUR CLIENT:
Under Section 16(2)(aa) and Rule 36(4), our client is denied ITC. You have illegally retained tax collected from our client without depositing or correctly reporting it to the Government Treasury, violating Section 16(2)(c).

DEMAND:
You are called upon to rectify this omission in your GSTR-1 return within ${cureDays} (Seven) days of receipt of this notice, failing which our client will immediately:
(a) Exercise their legal right of set-off by debiting ${totalRiskStr} plus interest @ 18% p.a. against your pending payments;
(b) Report this GST non-compliance to the jurisdictional GST Commissionerate;
(c) Initiate civil recovery proceedings for financial damages and recovery of tax.

Treat this as urgent and final.

Yours faithfully,

For ${caFirm}
Tax Counsel for ${ctx.clientName}`;

  const htmlText = `
    <div style="font-family: Georgia, serif; color: #111827; line-height: 1.7; max-width: 680px; margin: 0 auto; padding: 24px; border: 1px solid #d1d5db; background-color: #ffffff;">
      <div style="text-align: center; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="font-size: 18px; letter-spacing: 1px; text-transform: uppercase; margin: 0;">Formal Demand Notice</h2>
        <p style="font-size: 12px; color: #4b5563; margin: 4px 0 0;">Under Section 16(2)(aa) & 16(2)(c) of the CGST Act, 2017</p>
      </div>
      <p style="font-size: 13px;"><strong>Ref No:</strong> ${ctx.referenceNumber || `DEMAND/${ctx.periodYear}/${ctx.periodMonth}`}<br/>
      <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
      <p style="font-size: 14px;"><strong>To:</strong> ${ctx.vendorName} (GSTIN: ${ctx.vendorGstin})</p>
      <p style="font-size: 14px;"><strong>From:</strong> ${caFirm} on behalf of ${ctx.clientName} (GSTIN: ${ctx.clientGstin})</p>
      <p style="font-size: 14px; font-weight: bold; color: #991b1b;">SUBJECT: DEMAND FOR RECTIFICATION OF UNREFLECTED GST ITC OF ${totalRiskStr}</p>
      <p style="font-size: 13px;">Our client has discharged all payment obligations. Due to your failure to file/amend GSTR-1, our client is deprived of ${totalRiskStr} legitimate Input Tax Credit. You are granted ${cureDays} days to rectify this in GSTR-1, failing which set-off and legal recovery will commence.</p>
      ${generateHtmlTable(ctx.invoices)}
      <div style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 12px;">
        <p>Authorized Signatory / Legal Tax Counsel<br/><strong>${caFirm}</strong></p>
      </div>
    </div>
  `;

  return {
    subject,
    plainText,
    htmlText,
    templateType: 'settlement_demand',
    totalTaxAtRisk: ctx.totalTaxAtRisk,
    invoicesCount: ctx.invoices.length,
    suggestedRecipient: ctx.vendorEmail || 'directors@vendor.com',
  };
}
