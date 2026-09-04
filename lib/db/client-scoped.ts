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
    .select('*')
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

  const { data, error } = await query;
  if (error) {
    console.warn(`Error querying client scoped invoices (Client: ${clientId}):`, error.message);
    return [];
  }
  return data || [];
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

    const { count: docCount } = await docQuery;
    defaultSummary.totalDocuments = docCount || 0;

    // 2. Fetch invoices summary
    let invQuery = supabase
      .from('invoices')
      .select('taxable_value, cgst, sgst, igst, recon_status')
      .eq('client_id', clientId)
      .eq('firm_id', firmId);

    if (periodMonth) invQuery = invQuery.eq('period_month', periodMonth);
    if (periodYear) invQuery = invQuery.eq('period_year', periodYear);

    const { data: invoices, error: invError } = await invQuery;

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
