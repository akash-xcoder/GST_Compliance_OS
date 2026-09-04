-- ==============================================================================
-- GST AI Compliance Studio: Invoices Table & Security Policies
-- PROMPT 6: AI Data Extraction Pipeline
-- ==============================================================================

-- 1. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  supplier_gstin VARCHAR(15) NOT NULL,
  invoice_date DATE NOT NULL,
  taxable_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  cgst NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  sgst NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  igst NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  source VARCHAR(20) NOT NULL CHECK (source IN ('books', 'gstr_2b')),
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2017),
  recon_status VARCHAR(30) DEFAULT 'unmatched',
  status VARCHAR(30) DEFAULT 'unmatched',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration support for existing table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS recon_status VARCHAR(30) DEFAULT 'unmatched';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS ai_explanation TEXT;

-- Index for fast queries and reconciliation matching
CREATE INDEX IF NOT EXISTS idx_invoices_firm_client 
  ON public.invoices(firm_id, client_id);

CREATE INDEX IF NOT EXISTS idx_invoices_reconciliation 
  ON public.invoices(client_id, period_year, period_month, source, supplier_gstin, invoice_number);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Firm users can only read their own firm's invoices
DROP POLICY IF EXISTS "Firm users can view own invoices" ON public.invoices;
CREATE POLICY "Firm users can view own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  firm_id IN (
    SELECT firm_id 
    FROM public.firm_users 
    WHERE user_id = auth.uid()
  )
);

-- 4. Policy: Firm users can insert invoices for their own firm
DROP POLICY IF EXISTS "Firm users can insert own invoices" ON public.invoices;
CREATE POLICY "Firm users can insert own invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  firm_id IN (
    SELECT firm_id 
    FROM public.firm_users 
    WHERE user_id = auth.uid()
  )
);

-- 5. Policy: Firm users can update their own invoices
DROP POLICY IF EXISTS "Firm users can update own invoices" ON public.invoices;
CREATE POLICY "Firm users can update own invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  firm_id IN (
    SELECT firm_id 
    FROM public.firm_users 
    WHERE user_id = auth.uid()
  )
);

-- 6. Policy: Firm users can delete their own invoices
DROP POLICY IF EXISTS "Firm users can delete own invoices" ON public.invoices;
CREATE POLICY "Firm users can delete own invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (
  firm_id IN (
    SELECT firm_id 
    FROM public.firm_users 
    WHERE user_id = auth.uid()
  )
);
