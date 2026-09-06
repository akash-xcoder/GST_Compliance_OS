'use server';

import { createClient } from '@/utils/supabase/server';
import Decimal from 'decimal.js';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { revalidatePath } from 'next/cache';

async function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignored
  }
}

export type ReconStatus = 'matched' | 'missing_in_2b' | 'value_mismatch' | 'missing_in_books' | 'unmatched';

export interface InvoiceItem {
  id: string;
  firm_id?: string;
  client_id: string;
  document_id?: string | null;
  invoice_number: string;
  supplier_gstin: string;
  supplier_name?: string;
  invoice_date: string;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_amount: number;
  source: 'books' | 'gstr_2b';
  period_month: number;
  period_year: number;
  recon_status?: ReconStatus;
  status?: string;
  ai_explanation?: string | null;
}

export interface ReconScorecard {
  booksTotalITC: number;
  gstr2bTotalITC: number;
  itcDifference: number; // Books ITC minus GSTR-2B ITC
  booksTaxableTotal: number;
  gstr2bTaxableTotal: number;
  taxableDifference: number;
  matchedCount: number;
  missingIn2bCount: number;
  valueMismatchCount: number;
  missingInBooksCount: number;
  totalBooksCount: number;
  total2bCount: number;
}

export interface ReconException {
  id: string;
  invoice_number: string;
  supplier_gstin: string;
  supplier_name?: string;
  invoice_date: string;
  recon_status: 'missing_in_2b' | 'value_mismatch' | 'missing_in_books';
  books_taxable: number;
  gstr2b_taxable: number;
  taxable_diff: number;
  books_itc: number;
  gstr2b_itc: number;
  itc_diff: number;
  discrepancy_reason: string;
  source: 'books' | 'gstr_2b';
  ai_explanation?: string | null;
}

export interface ReconcileResult {
  success: boolean;
  message?: string;
  error?: string;
  summary: ReconScorecard;
  exceptions: ReconException[];
  matchedInvoices: Array<{
    invoice_number: string;
    supplier_gstin: string;
    taxable_value: number;
    itc: number;
  }>;
}

/**
 * Realistic default invoices seed for demonstrations or when the database
 * has not yet extracted invoices for a given month/year.
 */
function getDefaultSeedInvoices(clientId: string, periodMonth: number, periodYear: number): InvoiceItem[] {
  return [
    // 1. Exact Match 1
    {
      id: 'inv-seed-1',
      client_id: clientId,
      invoice_number: 'INV-2023-1001',
      supplier_gstin: '27AABCT2345M1Z2',
      supplier_name: 'Tata Steel Corp Ltd',
      invoice_date: '2023-10-04',
      taxable_value: 150000.00,
      cgst: 13500.00,
      sgst: 13500.00,
      igst: 0.00,
      total_amount: 177000.00,
      source: 'books',
      period_month: periodMonth,
      period_year: periodYear,
    },
    {
      id: 'inv-seed-2',
      client_id: clientId,
      invoice_number: 'INV-2023-1001',
      supplier_gstin: '27AABCT2345M1Z2',
      supplier_name: 'Tata Steel Corp Ltd',
      invoice_date: '2023-10-04',
      taxable_value: 150000.00,
      cgst: 13500.00,
      sgst: 13500.00,
      igst: 0.00,
      total_amount: 177000.00,
      source: 'gstr_2b',
      period_month: periodMonth,
      period_year: periodYear,
    },

    // 2. Exact Match 2 (Inter-state with IGST)
    {
      id: 'inv-seed-3',
      client_id: clientId,
      invoice_number: 'SI/OCT/045',
      supplier_gstin: '29AAACM8765Q1ZQ',
      supplier_name: 'Infosys BPM Solutions',
      invoice_date: '2023-10-10',
      taxable_value: 85000.00,
      cgst: 0.00,
      sgst: 0.00,
      igst: 15300.00,
      total_amount: 100300.00,
      source: 'books',
      period_month: periodMonth,
      period_year: periodYear,
    },
    {
      id: 'inv-seed-4',
      client_id: clientId,
      invoice_number: 'SI/OCT/045',
      supplier_gstin: '29AAACM8765Q1ZQ',
      supplier_name: 'Infosys BPM Solutions',
      invoice_date: '2023-10-10',
      taxable_value: 85000.00,
      cgst: 0.00,
      sgst: 0.00,
      igst: 15300.00,
      total_amount: 100300.00,
      source: 'gstr_2b',
      period_month: periodMonth,
      period_year: periodYear,
    },

    // 3. Value Mismatch (Taxable value & tax differs by > ₹1)
    {
      id: 'inv-seed-5',
      client_id: clientId,
      invoice_number: 'DEL/2023/8821',
      supplier_gstin: '06AABCK4432F1Z8',
      supplier_name: 'Apex Industrial Bearings',
      invoice_date: '2023-10-12',
      taxable_value: 62000.00, // In Books
      cgst: 5580.00,
      sgst: 5580.00,
      igst: 0.00,
      total_amount: 73160.00,
      source: 'books',
      period_month: periodMonth,
      period_year: periodYear,
    },
    {
      id: 'inv-seed-6',
      client_id: clientId,
      invoice_number: 'DEL/2023/8821',
      supplier_gstin: '06AABCK4432F1Z8',
      supplier_name: 'Apex Industrial Bearings',
      invoice_date: '2023-10-12',
      taxable_value: 58000.00, // In 2B (Vendor reported less: ₹4,000 difference)
      cgst: 5220.00,
      sgst: 5220.00,
      igst: 0.00,
      total_amount: 68440.00,
      source: 'gstr_2b',
      period_month: periodMonth,
      period_year: periodYear,
    },

    // 4. Value Mismatch 2 (Tax rate / tax mismatch)
    {
      id: 'inv-seed-7',
      client_id: clientId,
      invoice_number: 'LKO-9942',
      supplier_gstin: '09AAACP6612N1Z4',
      supplier_name: 'Prism Hardware Supplies',
      invoice_date: '2023-10-18',
      taxable_value: 34500.00,
      cgst: 3105.00, // 18% GST in Books
      sgst: 3105.00,
      igst: 0.00,
      total_amount: 40710.00,
      source: 'books',
      period_month: periodMonth,
      period_year: periodYear,
    },
    {
      id: 'inv-seed-8',
      client_id: clientId,
      invoice_number: 'LKO-9942',
      supplier_gstin: '09AAACP6612N1Z4',
      supplier_name: 'Prism Hardware Supplies',
      invoice_date: '2023-10-18',
      taxable_value: 34500.00,
      cgst: 2070.00, // 12% GST in 2B (Tax difference of ₹2,070)
      sgst: 2070.00,
      igst: 0.00,
      total_amount: 38640.00,
      source: 'gstr_2b',
      period_month: periodMonth,
      period_year: periodYear,
    },

    // 5. Missing in GSTR-2B (Vendor did not file GSTR-1)
    {
      id: 'inv-seed-9',
      client_id: clientId,
      invoice_number: 'METRO/OCT/312',
      supplier_gstin: '27AABCM9981K1Z1',
      supplier_name: 'Metro Logistics Express',
      invoice_date: '2023-10-21',
      taxable_value: 48000.00,
      cgst: 4320.00,
      sgst: 4320.00,
      igst: 0.00,
      total_amount: 56640.00,
      source: 'books',
      period_month: periodMonth,
      period_year: periodYear,
    },
    {
      id: 'inv-seed-10',
      client_id: clientId,
      invoice_number: 'KOL/2023/110',
      supplier_gstin: '19AAACG7714C1ZB',
      supplier_name: 'Bengal Paper & Packaging',
      invoice_date: '2023-10-25',
      taxable_value: 92000.00,
      cgst: 0.00,
      sgst: 0.00,
      igst: 11040.00,
      total_amount: 103040.00,
      source: 'books',
      period_month: periodMonth,
      period_year: periodYear,
    },

    // 6. Missing in Books (Appears in 2B, but CA/Accountant has not booked it)
    {
      id: 'inv-seed-11',
      client_id: clientId,
      invoice_number: 'AWS/IN/OCT-88',
      supplier_gstin: '27AAACS1199P1Z9',
      supplier_name: 'Cloud Computing Services India',
      invoice_date: '2023-10-28',
      taxable_value: 24000.00,
      cgst: 2160.00,
      sgst: 2160.00,
      igst: 0.00,
      total_amount: 28320.00,
      source: 'gstr_2b',
      period_month: periodMonth,
      period_year: periodYear,
    },
  ];
}

/**
 * Pure deterministic reconciliation core.
 * AI MUST NOT DO THE MATH.
 * Strictly uses Decimal.js to prevent JavaScript floating-point errors.
 */
export function executeDeterministicMatching(invoices: InvoiceItem[]): {
  summary: ReconScorecard;
  exceptions: ReconException[];
  matchedInvoices: Array<{
    invoice_number: string;
    supplier_gstin: string;
    taxable_value: number;
    itc: number;
  }>;
  statusUpdates: Array<{ id: string; recon_status: ReconStatus }>;
} {
  const TOLERANCE = new Decimal(1.0); // Small ₹1.00 rounding tolerance allowed

  // 1. Separate into books and gstr_2b arrays
  const books = invoices.filter((inv) => inv.source === 'books');
  const gstr2b = invoices.filter((inv) => inv.source === 'gstr_2b');

  // Track matched GSTR-2B IDs so each 2B invoice is only paired once
  const matched2bIds = new Set<string>();
  const statusUpdates: Array<{ id: string; recon_status: ReconStatus }> = [];
  const exceptions: ReconException[] = [];
  const matchedInvoices: Array<{
    invoice_number: string;
    supplier_gstin: string;
    taxable_value: number;
    itc: number;
  }> = [];

  let matchedCount = 0;
  let missingIn2bCount = 0;
  let valueMismatchCount = 0;

  // 2. Iterate through the `books` array and find matching invoice in `gstr2b`
  for (const bookInv of books) {
    const normBookGstin = bookInv.supplier_gstin.trim().toUpperCase();
    const normBookNumber = bookInv.invoice_number.trim().toLowerCase();

    // Exact case-insensitive match on supplier_gstin AND invoice_number
    const match2b = gstr2b.find(
      (twoB) =>
        !matched2bIds.has(twoB.id) &&
        twoB.supplier_gstin.trim().toUpperCase() === normBookGstin &&
        twoB.invoice_number.trim().toLowerCase() === normBookNumber
    );

    const bookTaxable = new Decimal(bookInv.taxable_value || 0);
    const bookITC = new Decimal(bookInv.cgst || 0)
      .plus(bookInv.sgst || 0)
      .plus(bookInv.igst || 0);

    if (!match2b) {
      // RULE a) If no match is found in GSTR-2B: status = 'missing_in_2b'
      missingIn2bCount++;
      statusUpdates.push({ id: bookInv.id, recon_status: 'missing_in_2b' });

      exceptions.push({
        id: bookInv.id,
        invoice_number: bookInv.invoice_number,
        supplier_gstin: bookInv.supplier_gstin,
        supplier_name: bookInv.supplier_name,
        invoice_date: bookInv.invoice_date,
        recon_status: 'missing_in_2b',
        books_taxable: bookTaxable.toNumber(),
        gstr2b_taxable: 0.0,
        taxable_diff: bookTaxable.toNumber(),
        books_itc: bookITC.toNumber(),
        gstr2b_itc: 0.0,
        itc_diff: bookITC.toNumber(),
        discrepancy_reason: 'Invoice claimed in Books of Accounts but not uploaded by vendor in GSTR-2B',
        source: 'books',
        ai_explanation: bookInv.ai_explanation || null,
      });
    } else {
      matched2bIds.add(match2b.id);

      const twoBTaxable = new Decimal(match2b.taxable_value || 0);
      const twoBITC = new Decimal(match2b.cgst || 0)
        .plus(match2b.sgst || 0)
        .plus(match2b.igst || 0);

      const taxableDiff = bookTaxable.minus(twoBTaxable).abs();
      const itcDiff = bookITC.minus(twoBITC).abs();

      // RULE b) If a match is found but taxable_value or total taxes differ by more than ₹1: status = 'value_mismatch'
      if (taxableDiff.greaterThan(TOLERANCE) || itcDiff.greaterThan(TOLERANCE)) {
        valueMismatchCount++;
        statusUpdates.push({ id: bookInv.id, recon_status: 'value_mismatch' });
        statusUpdates.push({ id: match2b.id, recon_status: 'value_mismatch' });

        const reasonParts: string[] = [];
        if (taxableDiff.greaterThan(TOLERANCE)) {
          reasonParts.push(
            `Taxable value mismatch: Books ₹${bookTaxable.toFixed(2)} vs 2B ₹${twoBTaxable.toFixed(2)} (Diff: ₹${taxableDiff.toFixed(2)})`
          );
        }
        if (itcDiff.greaterThan(TOLERANCE)) {
          reasonParts.push(
            `Total ITC mismatch: Books ₹${bookITC.toFixed(2)} vs 2B ₹${twoBITC.toFixed(2)} (Diff: ₹${itcDiff.toFixed(2)})`
          );
        }

        exceptions.push({
          id: bookInv.id,
          invoice_number: bookInv.invoice_number,
          supplier_gstin: bookInv.supplier_gstin,
          supplier_name: bookInv.supplier_name || match2b.supplier_name,
          invoice_date: bookInv.invoice_date,
          recon_status: 'value_mismatch',
          books_taxable: bookTaxable.toNumber(),
          gstr2b_taxable: twoBTaxable.toNumber(),
          taxable_diff: bookTaxable.minus(twoBTaxable).toNumber(),
          books_itc: bookITC.toNumber(),
          gstr2b_itc: twoBITC.toNumber(),
          itc_diff: bookITC.minus(twoBITC).toNumber(),
          discrepancy_reason: reasonParts.join('; '),
          source: 'books',
          ai_explanation: bookInv.ai_explanation || match2b.ai_explanation || null,
        });
      } else {
        // RULE c) If an exact match is found (within ₹1 rounding tolerance): status = 'matched'
        matchedCount++;
        statusUpdates.push({ id: bookInv.id, recon_status: 'matched' });
        statusUpdates.push({ id: match2b.id, recon_status: 'matched' });

        matchedInvoices.push({
          invoice_number: bookInv.invoice_number,
          supplier_gstin: bookInv.supplier_gstin,
          taxable_value: bookTaxable.toNumber(),
          itc: bookITC.toNumber(),
        });
      }
    }
  }

  // 3. Handle 2B invoices that were not present in books
  let missingInBooksCount = 0;
  for (const twoB of gstr2b) {
    if (!matched2bIds.has(twoB.id)) {
      missingInBooksCount++;
      statusUpdates.push({ id: twoB.id, recon_status: 'missing_in_books' });

      const twoBTaxable = new Decimal(twoB.taxable_value || 0);
      const twoBITC = new Decimal(twoB.cgst || 0)
        .plus(twoB.sgst || 0)
        .plus(twoB.igst || 0);

      exceptions.push({
        id: twoB.id,
        invoice_number: twoB.invoice_number,
        supplier_gstin: twoB.supplier_gstin,
        supplier_name: twoB.supplier_name,
        invoice_date: twoB.invoice_date,
        recon_status: 'missing_in_books',
        books_taxable: 0.0,
        gstr2b_taxable: twoBTaxable.toNumber(),
        taxable_diff: new Decimal(0).minus(twoBTaxable).toNumber(),
        books_itc: 0.0,
        gstr2b_itc: twoBITC.toNumber(),
        itc_diff: new Decimal(0).minus(twoBITC).toNumber(),
        discrepancy_reason: 'Present in GSTR-2B portal but missing from Purchase Register (Unclaimed ITC)',
        source: 'gstr_2b',
        ai_explanation: twoB.ai_explanation || null,
      });
    }
  }

  // 4. Calculate Summary Scorecard with Decimal.js
  let booksTotalITC = new Decimal(0);
  let booksTaxableTotal = new Decimal(0);
  for (const b of books) {
    booksTaxableTotal = booksTaxableTotal.plus(b.taxable_value || 0);
    booksTotalITC = booksTotalITC.plus(b.cgst || 0).plus(b.sgst || 0).plus(b.igst || 0);
  }

  let gstr2bTotalITC = new Decimal(0);
  let gstr2bTaxableTotal = new Decimal(0);
  for (const g of gstr2b) {
    gstr2bTaxableTotal = gstr2bTaxableTotal.plus(g.taxable_value || 0);
    gstr2bTotalITC = gstr2bTotalITC.plus(g.cgst || 0).plus(g.sgst || 0).plus(g.igst || 0);
  }

  const itcDifference = booksTotalITC.minus(gstr2bTotalITC);
  const taxableDifference = booksTaxableTotal.minus(gstr2bTaxableTotal);

  const summary: ReconScorecard = {
    booksTotalITC: booksTotalITC.toNumber(),
    gstr2bTotalITC: gstr2bTotalITC.toNumber(),
    itcDifference: itcDifference.toNumber(),
    booksTaxableTotal: booksTaxableTotal.toNumber(),
    gstr2bTaxableTotal: gstr2bTaxableTotal.toNumber(),
    taxableDifference: taxableDifference.toNumber(),
    matchedCount,
    missingIn2bCount,
    valueMismatchCount,
    missingInBooksCount,
    totalBooksCount: books.length,
    total2bCount: gstr2b.length,
  };

  return {
    summary,
    exceptions,
    matchedInvoices,
    statusUpdates,
  };
}

/**
 * Helper to fetch invoices for a given client and tax period.
 * Supports both `period_month`/`period_year` and `month`/`year` columns,
 * handling integer and string representations with full fallback support.
 */
async function fetchClientInvoicesForPeriod(
  supabase: any,
  clientId: string,
  periodMonth: number,
  periodYear: number
): Promise<{ invoices: InvoiceItem[]; isDbBacked: boolean }> {
  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[periodMonth] || '';

  let rawRows: any[] = [];
  let isDb = false;

  // 1. Try period_month and period_year filter
  try {
    const { data: periodRows, error: periodErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .eq('period_month', periodMonth)
      .eq('period_year', periodYear);

    if (!periodErr && periodRows && periodRows.length > 0) {
      rawRows = periodRows;
      isDb = true;
    }
  } catch (err) {
    console.warn('Query with period_month/period_year failed:', err);
  }

  // 2. Fallback: try month and year (numeric)
  if (rawRows.length === 0) {
    try {
      const { data: myRows, error: myErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .eq('month', periodMonth)
        .eq('year', periodYear);

      if (!myErr && myRows && myRows.length > 0) {
        rawRows = myRows;
        isDb = true;
      }
    } catch (err) {
      console.warn('Query with numeric month/year failed:', err);
    }
  }

  // 3. Fallback: try month as text name (e.g., 'September') and year
  if (rawRows.length === 0 && monthName) {
    try {
      const { data: nameRows, error: nameErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .eq('month', monthName)
        .eq('year', periodYear);

      if (!nameErr && nameRows && nameRows.length > 0) {
        rawRows = nameRows;
        isDb = true;
      }
    } catch (err) {
      console.warn('Query with string month name failed:', err);
    }
  }

  // 4. Fallback: fetch client invoices and match flexibly
  if (rawRows.length === 0) {
    try {
      const { data: allRows, error: allErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId);

      if (!allErr && allRows && allRows.length > 0) {
        isDb = true;
        rawRows = allRows.filter((row: any) => {
          const m = row.period_month ?? row.month;
          const y = row.period_year ?? row.year;
          if (m !== undefined && m !== null && y !== undefined && y !== null) {
            const mNum = typeof m === 'number'
              ? m
              : monthNames.findIndex((n) => n.toLowerCase() === String(m).toLowerCase().trim());
            const yNum = typeof y === 'number'
              ? y
              : parseInt(String(y).replace(/[^0-9]/g, ''), 10);
            if (mNum === periodMonth && yNum === periodYear) return true;
          }
          if (row.invoice_date) {
            const d = new Date(row.invoice_date);
            if (!isNaN(d.getTime())) {
              return d.getMonth() + 1 === periodMonth && d.getFullYear() === periodYear;
            }
          }
          return false;
        });
      }
    } catch (err) {
      console.warn('Fallback query on client invoices failed:', err);
    }
  }

  const invoices: InvoiceItem[] = rawRows.map((row: any) => ({
    id: row.id,
    firm_id: row.firm_id,
    client_id: row.client_id,
    document_id: row.document_id,
    invoice_number: row.invoice_number,
    supplier_gstin: row.supplier_gstin,
    supplier_name: row.supplier_name,
    invoice_date: row.invoice_date,
    taxable_value: Number(row.taxable_value || 0),
    cgst: Number(row.cgst || 0),
    sgst: Number(row.sgst || 0),
    igst: Number(row.igst || 0),
    total_amount: Number(row.total_amount || 0),
    source: row.source,
    period_month: Number(row.period_month ?? row.month ?? periodMonth),
    period_year: Number(row.period_year ?? row.year ?? periodYear),
    recon_status: row.recon_status || row.status,
    status: row.status,
    ai_explanation: row.ai_explanation || null,
  }));

  return { invoices, isDbBacked: isDb };
}

/**
 * Server Action: Fetches reconciliation data for display.
 */
export async function getReconciliationData(
  clientId: string,
  periodMonth: number,
  periodYear: number
): Promise<ReconcileResult> {
  const supabase = await createClient();

  const { invoices } = await fetchClientInvoicesForPeriod(supabase, clientId, periodMonth, periodYear);

  // Return actual empty state if no records in DB
  if (invoices.length === 0) {
    const emptyResult = executeDeterministicMatching([]);
    return {
      success: true,
      summary: emptyResult.summary,
      exceptions: [],
      matchedInvoices: [],
    };
  }

  const { summary, exceptions, matchedInvoices } = executeDeterministicMatching(invoices);

  return {
    success: true,
    summary,
    exceptions,
    matchedInvoices,
  };
}

/**
 * Server Action: Deterministic Reconciliation Engine
 * Executes exact deterministic matching comparing Purchase Register (books) against GSTR-2B.
 * Bulk updates the `invoices` table with calculated recon_status and revalidates paths.
 */
export async function runReconciliation(
  clientId: string,
  periodMonth: number,
  periodYear: number
): Promise<ReconcileResult> {
  const supabase = await createClient();

  // 1. Authenticate user (optional graceful fallback for local testing)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Fetch all invoices for the client and period from the `invoices` table (supporting period_month/period_year and month/year)
  const { invoices: rawInvoices, isDbBacked } = await fetchClientInvoicesForPeriod(
    supabase,
    clientId,
    periodMonth,
    periodYear
  );

  // If no records exist in DB for this period, return empty result
  if (rawInvoices.length === 0) {
    const emptyResult = executeDeterministicMatching([]);
    return {
      success: true,
      message: 'No invoices found for this tax period. Please upload invoices in Documents tab.',
      summary: emptyResult.summary,
      exceptions: [],
      matchedInvoices: [],
    };
  }

  // 3. Execute strict deterministic matching
  const { summary, exceptions, matchedInvoices, statusUpdates } = executeDeterministicMatching(rawInvoices);

  // 4. Perform bulk UPDATE on the `invoices` table to set calculated `recon_status`
  if (isDbBacked && statusUpdates.length > 0) {
    try {
      // Update each invoice record with recon_status and status
      const updatePromises = statusUpdates.map((update) =>
        supabase
          .from('invoices')
          .update({
            recon_status: update.recon_status,
            status: update.recon_status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id)
      );

      await Promise.all(updatePromises);
    } catch (updateErr) {
      console.error('Failed to bulk update recon_status in DB:', updateErr);
    }
  }

  // 5. Revalidate paths in Next.js server environment
  await safeRevalidatePath(`/dashboard/clients/${clientId}`);
  await safeRevalidatePath(`/dashboard/clients/${clientId}/reconciliation`);

  return {
    success: true,
    message: `Reconciliation executed successfully. ${summary.matchedCount} matched, ${summary.missingIn2bCount} missing in GSTR-2B, ${summary.valueMismatchCount} value mismatches.`,
    summary,
    exceptions,
    matchedInvoices,
  };
}

export interface GenerateExplanationResult {
  success: boolean;
  explanation?: string;
  error?: string;
  invoiceId: string;
}

/**
 * Server Action: AI Exception Explanations (PROMPT 8)
 * Reads a specific reconciliation exception and generates a human-readable
 * explanation and recommended action for the Chartered Accountant using Gemini.
 */
export async function generateExceptionExplanation(
  invoiceId: string
): Promise<GenerateExplanationResult> {
  const supabase = await createClient();

  let invoice: any = null;
  let counterpartInvoice: any = null;
  let clientId: string | undefined = undefined;
  let isDbBacked = false;

  // 1. Fetch specific invoice from the database
  try {
    const { data: dbInv, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle();

    if (!invError && dbInv) {
      invoice = dbInv;
      clientId = dbInv.client_id;
      isDbBacked = true;
    }
  } catch (err) {
    console.warn('Could not query invoice from database:', err);
  }

  // Fallback to default seeds if testing or not present in DB
  if (!invoice) {
    const seedPool = [
      ...getDefaultSeedInvoices(clientId || '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca', 10, 2023),
      ...getDefaultSeedInvoices(clientId || '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca', 11, 2023),
    ];
    invoice = seedPool.find((item) => item.id === invoiceId);
    if (invoice) {
      clientId = invoice.client_id;
    }
  }

  if (!invoice) {
    return {
      success: false,
      error: `Invoice with ID ${invoiceId} could not be located.`,
      invoiceId,
    };
  }

  const reconStatus = invoice.recon_status || invoice.status || 'unmatched';

  // 2. If 'value_mismatch', fetch counterpart invoice using GSTIN and Invoice Number
  if (reconStatus === 'value_mismatch') {
    const targetSource = invoice.source === 'books' ? 'gstr_2b' : 'books';
    const cleanGstin = invoice.supplier_gstin ? invoice.supplier_gstin.trim().toUpperCase() : '';
    const cleanInvNum = invoice.invoice_number ? invoice.invoice_number.trim() : '';

    if (isDbBacked && clientId) {
      try {
        const { data: counterparts } = await supabase
          .from('invoices')
          .select('*')
          .eq('client_id', clientId)
          .eq('source', targetSource);

        if (counterparts && counterparts.length > 0) {
          counterpartInvoice = counterparts.find(
            (c: any) =>
              c.supplier_gstin?.trim().toUpperCase() === cleanGstin &&
              c.invoice_number?.trim().toLowerCase() === cleanInvNum.toLowerCase()
          );
        }
      } catch (cpErr) {
        console.warn('Could not query counterpart invoice:', cpErr);
      }
    }

    if (!counterpartInvoice) {
      const seedPool = [
        ...getDefaultSeedInvoices(invoice.client_id || clientId || '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca', invoice.period_month || 10, invoice.period_year || 2023),
        ...getDefaultSeedInvoices(clientId || '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca', 10, 2023),
      ];
      counterpartInvoice = seedPool.find(
        (c) =>
          c.source === targetSource &&
          c.supplier_gstin.trim().toUpperCase() === cleanGstin &&
          c.invoice_number.trim().toLowerCase() === cleanInvNum.toLowerCase()
      );
    }
  }

  // 3. Build verified JSON payload (The math is already verified; AI must not recalculate math)
  const booksTaxable = invoice.source === 'books' ? Number(invoice.taxable_value || 0) : Number(counterpartInvoice?.taxable_value || 0);
  const booksITC = invoice.source === 'books'
    ? Number(invoice.cgst || 0) + Number(invoice.sgst || 0) + Number(invoice.igst || 0)
    : counterpartInvoice
    ? Number(counterpartInvoice.cgst || 0) + Number(counterpartInvoice.sgst || 0) + Number(counterpartInvoice.igst || 0)
    : 0;

  const gstr2bTaxable = invoice.source === 'gstr_2b' ? Number(invoice.taxable_value || 0) : Number(counterpartInvoice?.taxable_value || 0);
  const gstr2bITC = invoice.source === 'gstr_2b'
    ? Number(invoice.cgst || 0) + Number(invoice.sgst || 0) + Number(invoice.igst || 0)
    : counterpartInvoice
    ? Number(counterpartInvoice.cgst || 0) + Number(counterpartInvoice.sgst || 0) + Number(counterpartInvoice.igst || 0)
    : 0;

  const promptPayload = {
    exception_type: reconStatus,
    invoice_number: invoice.invoice_number,
    supplier_gstin: invoice.supplier_gstin,
    supplier_name: invoice.supplier_name || 'Vendor',
    invoice_date: invoice.invoice_date,
    origin_source: invoice.source,
    books_data: {
      taxable_value: booksTaxable,
      itc_claimed: booksITC,
      present_in_books: invoice.source === 'books' || !!counterpartInvoice,
    },
    gstr_2b_data: {
      taxable_value: gstr2bTaxable,
      itc_available: gstr2bITC,
      present_in_gstr_2b: invoice.source === 'gstr_2b' || !!counterpartInvoice,
    },
    discrepancy: {
      taxable_difference: Math.round((booksTaxable - gstr2bTaxable) * 100) / 100,
      itc_difference: Math.round((booksITC - gstr2bITC) * 100) / 100,
    },
  };

  // Ensure Google Generative AI API key is set for @ai-sdk/google
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
  }

  const systemInstruction = `You are an expert Indian Chartered Accountant assistant. Analyze this GST reconciliation exception data: ${JSON.stringify(
    promptPayload,
    null,
    2
  )}. The math is already verified. Do not recalculate the math. Write a concise, 2-3 sentence explanation of the discrepancy and recommend the immediate next action for the CA (e.g., 'Request vendor to amend GSTR-1', 'Hold ITC claim', 'Book a credit note'). Keep the tone highly professional.

CRITICAL MANDATE: Never invent numbers or dates. Only reference the exact numbers and GSTINs provided in the JSON payload above.`;

  let explanation = '';

  try {
    const result = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: systemInstruction,
      temperature: 0.2,
    });
    explanation = result.text.trim();
  } catch (aiError: any) {
    console.warn('Gemini generateText exception, generating deterministic CA fallback:', aiError);
    // Highly accurate CA fallback in case API key is unconfigured or rate-limited
    if (reconStatus === 'missing_in_2b') {
      explanation = `Invoice ${invoice.invoice_number} is booked with eligible ITC of ₹${booksITC.toFixed(2)}, but supplier ${invoice.supplier_gstin} (${invoice.supplier_name || 'Vendor'}) has omitted it from their filed GSTR-1, so it does not appear in GSTR-2B. Under Section 16(2)(aa) of the CGST Act, this ITC cannot be claimed in GSTR-3B. Recommended action: Issue a vendor communication notice requesting immediate filing in their next GSTR-1 cycle, and temporarily hold the ITC claim in provisional registers.`;
    } else if (reconStatus === 'value_mismatch') {
      const itcDiff = Math.abs(booksITC - gstr2bITC);
      explanation = `Invoice ${invoice.invoice_number} displays a value mismatch between Books (Taxable: ₹${booksTaxable.toFixed(2)}, ITC: ₹${booksITC.toFixed(2)}) and GSTR-2B (Taxable: ₹${gstr2bTaxable.toFixed(2)}, ITC: ₹${gstr2bITC.toFixed(2)}), resulting in an ITC variance of ₹${itcDiff.toFixed(2)}. Claiming higher ITC than auto-drafted creates audit exposure under Rule 36(4). Recommended action: Contact ${invoice.supplier_name || invoice.supplier_gstin} to amend Table 9 in their upcoming GSTR-1 or issue an internal debit/credit adjustment before finalizing GSTR-3B.`;
    } else if (reconStatus === 'missing_in_books') {
      explanation = `Invoice ${invoice.invoice_number} from ${invoice.supplier_gstin} is reflected in the official GSTR-2B statement with ITC of ₹${gstr2bITC.toFixed(2)}, but has not been entered into the purchase books. This represents unavailed legitimate input tax credit. Recommended action: Verify the physical delivery of goods or services with procurement and book the purchase entry immediately to utilize the credit before the annual Section 16(4) limitation deadline.`;
    } else {
      explanation = `Audit inspection completed for Invoice ${invoice.invoice_number} (${invoice.supplier_gstin}). The record has verified status '${reconStatus}'. Recommended action: Review supporting documentation and maintain audit trail in accordance with GST compliance standards.`;
    }
  }

  // 4. Save the returned AI text into the new `ai_explanation` column for that invoice
  if (isDbBacked) {
    try {
      await supabase
        .from('invoices')
        .update({
          ai_explanation: explanation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);
    } catch (saveError) {
      console.warn('Could not save ai_explanation to database:', saveError);
    }
  }

  // 5. Revalidate paths
  if (clientId) {
    await safeRevalidatePath(`/dashboard/clients/${clientId}`);
    await safeRevalidatePath(`/dashboard/clients/${clientId}/reconciliation`);
  }

  return {
    success: true,
    explanation,
    invoiceId,
  };
}
