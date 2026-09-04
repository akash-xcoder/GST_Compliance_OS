-- ==============================================================================
-- GST AI Compliance Studio: Multi-Client Compliance Tracker & Due-Date Calendar Schema
-- PROMPT 11: Global statutory filing tracker, due-date calculator & portfolio monitoring
-- ==============================================================================

-- 1. Create statutory_filings table
CREATE TABLE IF NOT EXISTS public.statutory_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  return_type VARCHAR(20) NOT NULL CHECK (
    return_type IN ('GSTR_1', 'GSTR_3B', 'CMP_08', 'GSTR_9', 'GSTR_9C')
  ),
  filing_period VARCHAR(40) NOT NULL,
  due_date DATE NOT NULL,
  filing_status VARCHAR(30) NOT NULL DEFAULT 'Not Started' CHECK (
    filing_status IN ('Not Started', 'Data Preparation', 'Pending Client Approval', 'Filed', 'Overdue')
  ),
  arn_number TEXT,
  date_of_filing DATE,
  tax_scheme VARCHAR(30) NOT NULL DEFAULT 'Regular' CHECK (
    tax_scheme IN ('Regular', 'QRMP', 'Composition')
  ),
  is_nil BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_late_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tax_liability_cash NUMERIC(15, 2) DEFAULT 0.00,
  itc_claimed NUMERIC(15, 2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, return_type, filing_period)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_statutory_filings_client ON public.statutory_filings(client_id);
CREATE INDEX IF NOT EXISTS idx_statutory_filings_firm ON public.statutory_filings(firm_id);
CREATE INDEX IF NOT EXISTS idx_statutory_filings_due_date ON public.statutory_filings(due_date);
CREATE INDEX IF NOT EXISTS idx_statutory_filings_status ON public.statutory_filings(filing_status);
CREATE INDEX IF NOT EXISTS idx_statutory_filings_period ON public.statutory_filings(filing_period);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.statutory_filings ENABLE ROW LEVEL SECURITY;

-- 4. Policies for firm members
DROP POLICY IF EXISTS "Firm users can view statutory filings" ON public.statutory_filings;
CREATE POLICY "Firm users can view statutory filings"
ON public.statutory_filings
FOR SELECT
TO authenticated
USING (
  firm_id IN (
    SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()
  )
  OR
  client_id IN (
    SELECT id FROM public.clients WHERE firm_id IN (
      SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Firm users can insert statutory filings" ON public.statutory_filings;
CREATE POLICY "Firm users can insert statutory filings"
ON public.statutory_filings
FOR INSERT
TO authenticated
WITH CHECK (
  firm_id IN (
    SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()
  )
  OR
  client_id IN (
    SELECT id FROM public.clients WHERE firm_id IN (
      SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Firm users can update statutory filings" ON public.statutory_filings;
CREATE POLICY "Firm users can update statutory filings"
ON public.statutory_filings
FOR UPDATE
TO authenticated
USING (
  firm_id IN (
    SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()
  )
  OR
  client_id IN (
    SELECT id FROM public.clients WHERE firm_id IN (
      SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()
    )
  )
);
