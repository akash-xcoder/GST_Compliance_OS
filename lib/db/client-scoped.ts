import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createBrowserClient } from '@/utils/supabase/client';

export interface ScopedQueryOptions {
  docType?: string;
  periodMonth?: number;
  periodYear?: number;
  source?: 'books' | 'gstr_2b';
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ClientComplianceSummary {
  clientId: string;
  firmId: string;
  totalDocuments: number;
  totalInvoices: number;
  unmatchedInvoices: number;
  totalTaxableValue: number;
  totalITC: number;
  latestReconDate?: string;
}

export interface ExtractionLogItem {
  id: string;
  firm_id: string;
  client_id: string;
  document_id?: string;
  file_name: string;
  doc_type: string;
  model_used: string;
  items_extracted: number;
  taxable_total: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  status: 'success' | 'failed' | 'partial';
  error_message?: string;
  execution_duration_ms: number;
  created_at: string;
}

/**
 * Validates that a client belongs to the active CA firm
 */
export async function verifyClientBelongsToFirm(
  clientId: string,
  firmId: string,
  isServer = true
): Promise<boolean> {
  try {
    const supabase = isServer ? await createServerClient() : createBrowserClient();
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('firm_id', firmId)
      .maybeSingle();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Strictly scoped query for documents belonging to a client
 */
export async function getScopedClientDocuments(
  clientId: string,
  firmId: string,
  options?: ScopedQueryOptions,
  isServer = true
) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  let query = supabase
    .from('documents')
    .select('*, clients(name, trade_name)')
    .eq('client_id', clientId)
    .eq('firm_id', firmId);

  if (options?.docType) {
    query = query.eq('doc_type', options.docType);
  }
  if (options?.periodMonth) {
    query = query.eq('period_month', options.periodMonth);
  }
  if (options?.periodYear) {
    query = query.eq('period_year', options.periodYear);
  }

  query = query.order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.warn(`Error querying client scoped documents (Client: ${clientId}):`, error.message);
    return [];
  }
  return data || [];
}

/**
 * Strictly scoped query for invoices belonging to a client
 */
export async function getScopedClientInvoices(
  clientId: string,
  firmId: string,
  options?: ScopedQueryOptions,
  isServer = true
) {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  let query = supabase
    .from('invoices')
    .select('*')
    .eq('client_id', clientId)
    .eq('firm_id', firmId);

  if (options?.source) {
    query = query.eq('source', options.source);
  }
  if (options?.periodMonth) {
    query = query.eq('period_month', options.periodMonth);
  }
  if (options?.periodYear) {
    query = query.eq('period_year', options.periodYear);
  }
  if (options?.status) {
    query = query.eq('recon_status', options.status);
  }

  query = query.order('invoice_date', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  let { data, error } = await query;

  // Fallback if table uses month & year instead of period_month & period_year
  if (error && (error.code === '42703' || error.message?.includes('period_month') || error.message?.includes('period_year'))) {
    let fallbackQuery = supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .eq('firm_id', firmId);

    if (options?.source) fallbackQuery = fallbackQuery.eq('source', options.source);
    if (options?.periodMonth) fallbackQuery = fallbackQuery.eq('month', options.periodMonth);
    if (options?.periodYear) fallbackQuery = fallbackQuery.eq('year', options.periodYear);
    if (options?.status) fallbackQuery = fallbackQuery.eq('recon_status', options.status);
    fallbackQuery = fallbackQuery.order('invoice_date', { ascending: false });
    if (options?.limit) fallbackQuery = fallbackQuery.limit(options.limit);

    const fallbackRes = await fallbackQuery;
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    console.warn(`Error querying client scoped invoices (Client: ${clientId}):`, error.message);
    return [];
  }
  return data || [];
}

/**
 * Helper to normalize month inputs (numbers 1-12 or names like "September", "Sep") into 1-12 integer.
 */
export function normalizeMonthNumber(month: number | string): number {
  if (typeof month === 'number') return month;
  const monthMap: Record<string, number> = {
    january: 1, jan: 1, '1': 1, '01': 1,
    february: 2, feb: 2, '2': 2, '02': 2,
    march: 3, mar: 3, '3': 3, '03': 3,
    april: 4, apr: 4, '4': 4, '04': 4,
    may: 5, '5': 5, '05': 5,
    june: 6, jun: 6, '6': 6, '06': 6,
    july: 7, jul: 7, '7': 7, '07': 7,
    august: 8, aug: 8, '8': 8, '08': 8,
    september: 9, sep: 9, '9': 9, '09': 9,
    october: 10, oct: 10, '10': 10,
    november: 11, nov: 11, '11': 11,
    december: 12, dec: 12, '12': 12,
  };
  return monthMap[month.toLowerCase().trim()] || 1;
}

/**
 * Fetch book invoices for a specific client, month, and year.
 * Maps to database columns `period_month` and `period_year` with fallback resilience.
 */
export async function getBookInvoices(
  supabase: any,
  selectedClientId: string,
  selectedMonth: number | string,
  selectedYear: number | string
) {
  const monthNum = normalizeMonthNumber(selectedMonth);
  const yearNum = typeof selectedYear === 'string' ? parseInt(selectedYear.replace(/[^0-9]/g, ''), 10) : selectedYear;

  // Primary query matching schema columns: period_month, period_year
  let { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', selectedClientId)
    .eq('source', 'books')
    .eq('period_month', monthNum)
    .eq('period_year', yearNum);

  // Fallback in case table has 'month' and 'year' column aliases
  if (error && (error.code === '42703' || error.message?.includes('period_month'))) {
    const fallback = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', selectedClientId)
      .eq('source', 'books')
      .eq('month', typeof selectedMonth === 'string' ? selectedMonth : monthNum)
      .eq('year', yearNum);
    data = fallback.data;
    error = fallback.error;
  }

  return { data, error };
}

/**
 * Fetches compliance metrics strictly scoped to the active client
 */
export async function getScopedClientComplianceMetrics(
  clientId: string,
  firmId: string,
  periodMonth?: number,
  periodYear?: number,
  isServer = true
): Promise<ClientComplianceSummary> {
  const supabase = isServer ? await createServerClient() : createBrowserClient();

  let defaultSummary: ClientComplianceSummary = {
    clientId,
    firmId,
    totalDocuments: 0,
    totalInvoices: 0,
    unmatchedInvoices: 0,
    totalTaxableValue: 0,
    totalITC: 0,
  };

  try {
    // 1. Fetch document count
    let docQuery = supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('firm_id', firmId);

    if (periodMonth) docQuery = docQuery.eq('period_month', periodMonth);
    if (periodYear) docQuery = docQuery.eq('period_year', periodYear);

    let { count: docCount, error: docError } = await docQuery;
    if (docError && (docError.code === '42703' || docError.message?.includes('period_month'))) {
      let fallbackDocQuery = supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('firm_id', firmId);
      if (periodMonth) fallbackDocQuery = fallbackDocQuery.eq('month', periodMonth);
      if (periodYear) fallbackDocQuery = fallbackDocQuery.eq('year', periodYear);
      const fallbackDocRes = await fallbackDocQuery;
      docCount = fallbackDocRes.count;
    }
    defaultSummary.totalDocuments = docCount || 0;

    // 2. Fetch invoices summary
    let invQuery = supabase
      .from('invoices')
      .select('taxable_value, cgst, sgst, igst, recon_status')
      .eq('client_id', clientId)
      .eq('firm_id', firmId);

    if (periodMonth) invQuery = invQuery.eq('period_month', periodMonth);
    if (periodYear) invQuery = invQuery.eq('period_year', periodYear);

    let { data: invoices, error: invError } = await invQuery;

    if (invError && (invError.code === '42703' || invError.message?.includes('period_month'))) {
      let fallbackInvQuery = supabase
        .from('invoices')
        .select('taxable_value, cgst, sgst, igst, recon_status')
        .eq('client_id', clientId)
        .eq('firm_id', firmId);
      if (periodMonth) fallbackInvQuery = fallbackInvQuery.eq('month', periodMonth);
      if (periodYear) fallbackInvQuery = fallbackInvQuery.eq('year', periodYear);
      const fallbackInvRes = await fallbackInvQuery;
      invoices = fallbackInvRes.data;
      invError = fallbackInvRes.error;
    }

    if (!invError && invoices) {
      defaultSummary.totalInvoices = invoices.length;
      let sumTaxable = 0;
      let sumITC = 0;
      let unmatched = 0;

      for (const inv of invoices) {
        sumTaxable += Number(inv.taxable_value || 0);
        sumITC += Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0);
        if (inv.recon_status && inv.recon_status !== 'matched') {
          unmatched++;
        }
      }

      defaultSummary.totalTaxableValue = sumTaxable;
      defaultSummary.totalITC = sumITC;
      defaultSummary.unmatchedInvoices = unmatched;
    }
  } catch (err: any) {
    console.warn('Notice computing scoped metrics:', err?.message);
  }

  return defaultSummary;
}

/**
 * Fetch data extraction audit logs strictly scoped to active client
 */
export async function getScopedExtractionLogs(
  clientId: string,
  firmId: string,
  isServer = true
): Promise<ExtractionLogItem[]> {
  try {
    const supabase = isServer ? await createServerClient() : createBrowserClient();
    const { data, error } = await supabase
      .from('extraction_logs')
      .select('*')
      .eq('client_id', clientId)
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('Notice fetching extraction logs:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Record an extraction log entry strictly tied to client and firm
 */
export async function logScopedExtraction(
  log: Omit<ExtractionLogItem, 'id' | 'created_at'>,
  isServer = true
) {
  try {
    const supabase = isServer ? await createServerClient() : createBrowserClient();
    await supabase.from('extraction_logs').insert([log]);
  } catch (err: any) {
    console.warn('Notice recording extraction log:', err?.message);
  }
}
