-- ==============================================================================
-- GST Compliance OS: Client Workspace Multi-Tenant Scoping Migration
-- PROMPT 8: Multi-Firm & Client Workspace Scoping & Data Isolation
-- ==============================================================================

-- 1. Ensure `documents` table has proper foreign keys and composite indexing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'firm_id'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Composite indexes for strict client workspace query performance
CREATE INDEX IF NOT EXISTS idx_documents_firm_client 
  ON public.documents(firm_id, client_id);

CREATE INDEX IF NOT EXISTS idx_documents_client_period 
  ON public.documents(client_id, period_year, period_month, doc_type);

-- 2. Ensure `invoices` table has composite indexing on client_id and firm_id
CREATE INDEX IF NOT EXISTS idx_invoices_client_firm 
  ON public.invoices(client_id, firm_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client_period_source 
  ON public.invoices(client_id, period_year, period_month, source, recon_status);

-- 3. Create `extraction_logs` table strictly scoped by client_id and firm_id
CREATE TABLE IF NOT EXISTS public.extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  doc_type VARCHAR(50) NOT NULL,
  model_used VARCHAR(50) NOT NULL DEFAULT 'gemini-2.5-flash',
  items_extracted INTEGER NOT NULL DEFAULT 0,
  taxable_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  cgst_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  sgst_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  igst_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  execution_duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_logs_client_firm 
  ON public.extraction_logs(firm_id, client_id, created_at DESC);

-- Enable RLS on extraction_logs
ALTER TABLE public.extraction_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm users view own extraction logs" ON public.extraction_logs;
CREATE POLICY "Firm users view own extraction logs"
ON public.extraction_logs
FOR SELECT
TO authenticated
USING (
  firm_id IN (
    SELECT firm_id 
    FROM public.firm_users 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Firm users insert own extraction logs" ON public.extraction_logs;
CREATE POLICY "Firm users insert own extraction logs"
ON public.extraction_logs
FOR INSERT
TO authenticated
WITH CHECK (
  firm_id IN (
    SELECT firm_id 
    FROM public.firm_users 
    WHERE user_id = auth.uid()
  )
);

-- 4. Create `reconciliation_runs` table strictly scoped by client_id and firm_id
CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2017),
  matched_count INTEGER NOT NULL DEFAULT 0,
  mismatched_count INTEGER NOT NULL DEFAULT 0,
  missing_pr_count INTEGER NOT NULL DEFAULT 0,
  missing_2b_count INTEGER NOT NULL DEFAULT 0,
  total_variance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  match_rate_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  executed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_client_firm 
  ON public.reconciliation_runs(firm_id, client_id, period_year, period_month);

-- Enable RLS on reconciliation_runs
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm users view own reconciliation runs" ON public.reconciliation_runs;
CREATE POLICY "Firm users view own reconciliation runs"
ON public.reconciliation_runs
FOR SELECT
TO authenticated
USING (
  firm_id IN (
    SELECT firm_id 
    FROM public.firm_users 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Firm users insert own reconciliation runs" ON public.reconciliation_runs;
CREATE POLICY "Firm users insert own reconciliation runs"
ON public.reconciliation_runs
FOR INSERT
TO authenticated
WITH CHECK (
  firm_id IN (
    SELECT firm_id 
    FROM public.firm_users 
    WHERE user_id = auth.uid()
  )
);

-- 5. Helper function: Get high-performance aggregated client compliance summary
CREATE OR REPLACE FUNCTION public.get_client_compliance_summary(
  p_firm_id UUID,
  p_client_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_doc_count INT;
  v_invoice_count INT;
  v_unmatched_count INT;
  v_total_taxable NUMERIC(14, 2);
  v_latest_recon TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Count documents for this client
  SELECT COUNT(*) INTO v_doc_count
  FROM public.documents
  WHERE firm_id = p_firm_id AND client_id = p_client_id;

  -- Count total invoices & sum taxable value
  SELECT COUNT(*), COALESCE(SUM(taxable_value), 0.00)
  INTO v_invoice_count, v_total_taxable
  FROM public.invoices
  WHERE firm_id = p_firm_id AND client_id = p_client_id;

  -- Count unmatched / exception invoices
  SELECT COUNT(*) INTO v_unmatched_count
  FROM public.invoices
  WHERE firm_id = p_firm_id AND client_id = p_client_id AND recon_status <> 'matched';

  -- Fetch latest reconciliation run timestamp
  SELECT MAX(created_at) INTO v_latest_recon
  FROM public.reconciliation_runs
  WHERE firm_id = p_firm_id AND client_id = p_client_id;

  v_result := jsonb_build_object(
    'client_id', p_client_id,
    'firm_id', p_firm_id,
    'total_documents', v_doc_count,
    'total_invoices', v_invoice_count,
    'unmatched_invoices', v_unmatched_count,
    'total_taxable_value', v_total_taxable,
    'latest_reconciliation', v_latest_recon
  );

  RETURN v_result;
END;
$$;
