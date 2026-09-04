-- ==============================================================================
-- GST AI Compliance Studio: Departmental Scrutiny & Notice Defense Schema
-- PROMPT 10: ASMT-10 / ASMT-11 / DRC-01 Statutory Defense Generator
-- ==============================================================================

-- 1. Create department_notices table
CREATE TABLE IF NOT EXISTS public.department_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  notice_reference_no TEXT NOT NULL UNIQUE,
  notice_type VARCHAR(20) NOT NULL CHECK (
    notice_type IN ('ASMT_10', 'DRC_01A', 'DRC_01', 'REG_17')
  ),
  financial_year VARCHAR(15) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  demand_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  demand_interest NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  demand_penalty NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  allegation_category VARCHAR(30) NOT NULL CHECK (
    allegation_category IN ('GSTR_1_VS_3B', 'ITC_2B_VS_3B', 'EWAY_BILL_MISMATCH', 'CANCELLED_SUPPLIER')
  ),
  status VARCHAR(30) NOT NULL DEFAULT 'Under Review' CHECK (
    status IN ('Under Review', 'Drafting Reply', 'Partner Approved', 'Submitted_ASMT11', 'Order Passed', 'Rectified')
  ),
  issuing_authority TEXT DEFAULT 'Superintendent of Central Tax, Range-IV, Division-II',
  jurisdiction_office TEXT DEFAULT 'Mumbai Central Commissionerate',
  allegation_description TEXT,
  discrepancy_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create notice_replies table
CREATE TABLE IF NOT EXISTS public.notice_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES public.department_notices(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  reply_reference_no TEXT NOT NULL,
  form_type VARCHAR(20) NOT NULL DEFAULT 'ASMT_11',
  subject TEXT NOT NULL,
  reply_date DATE NOT NULL DEFAULT CURRENT_DATE,
  preliminary_objections TEXT,
  factual_rebuttal TEXT NOT NULL,
  statutory_citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  reconciliation_annexures JSONB NOT NULL DEFAULT '[]'::jsonb,
  challan_details JSONB,
  tax_accepted NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  tax_disputed NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  interest_computed_50_1 NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  interest_disputed_50_3 NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  penalty_disputed NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'Draft' CHECK (
    status IN ('Draft', 'Partner Approved', 'Submitted_ASMT11')
  ),
  arn TEXT,
  submitted_at TIMESTAMPTZ,
  verified_by_name TEXT,
  verified_by_designation TEXT DEFAULT 'Authorized Signatory',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_dept_notices_client ON public.department_notices(client_id);
CREATE INDEX IF NOT EXISTS idx_dept_notices_due_date ON public.department_notices(due_date);
CREATE INDEX IF NOT EXISTS idx_dept_notices_status ON public.department_notices(status);
CREATE INDEX IF NOT EXISTS idx_dept_notices_category ON public.department_notices(allegation_category);

CREATE INDEX IF NOT EXISTS idx_notice_replies_notice ON public.notice_replies(notice_id);
CREATE INDEX IF NOT EXISTS idx_notice_replies_client ON public.notice_replies(client_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.department_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_replies ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for department_notices
DROP POLICY IF EXISTS "Firm users can view department notices" ON public.department_notices;
CREATE POLICY "Firm users can view department notices"
ON public.department_notices
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

DROP POLICY IF EXISTS "Firm users can create department notices" ON public.department_notices;
CREATE POLICY "Firm users can create department notices"
ON public.department_notices
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

DROP POLICY IF EXISTS "Firm users can update department notices" ON public.department_notices;
CREATE POLICY "Firm users can update department notices"
ON public.department_notices
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

-- 6. RLS Policies for notice_replies
DROP POLICY IF EXISTS "Firm users can view notice replies" ON public.notice_replies;
CREATE POLICY "Firm users can view notice replies"
ON public.notice_replies
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE firm_id IN (
      SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Firm users can insert notice replies" ON public.notice_replies;
CREATE POLICY "Firm users can insert notice replies"
ON public.notice_replies
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients WHERE firm_id IN (
      SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Firm users can update notice replies" ON public.notice_replies;
CREATE POLICY "Firm users can update notice replies"
ON public.notice_replies
FOR UPDATE
TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE firm_id IN (
      SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()
    )
  )
);
