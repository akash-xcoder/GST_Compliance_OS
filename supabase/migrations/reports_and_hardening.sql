-- Migration: Executive Audit Reports and Production Hardening
-- Table: audit_dossiers for archiving Annual GST Reconciliation & Assessment Dossiers

CREATE TABLE IF NOT EXISTS public.audit_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  client_id UUID NOT NULL,
  financial_year TEXT NOT NULL,
  report_title TEXT NOT NULL,
  report_status TEXT NOT NULL DEFAULT 'Draft' CHECK (
    report_status IN ('Draft', 'Under_Partner_Review', 'Approved_and_Signed', 'Client_Shared', 'Archived')
  ),
  opinion_type TEXT NOT NULL DEFAULT 'Unqualified (True & Fair)',
  turnover_books NUMERIC(15,2) DEFAULT 0,
  turnover_gstr1 NUMERIC(15,2) DEFAULT 0,
  turnover_gstr3b NUMERIC(15,2) DEFAULT 0,
  turnover_variance NUMERIC(15,2) DEFAULT 0,
  itc_books NUMERIC(15,2) DEFAULT 0,
  itc_gstr2b NUMERIC(15,2) DEFAULT 0,
  itc_gstr3b NUMERIC(15,2) DEFAULT 0,
  itc_rule36_4_exposure NUMERIC(15,2) DEFAULT 0,
  scrutiny_exposure NUMERIC(15,2) DEFAULT 0,
  scrutiny_notices_count INTEGER DEFAULT 0,
  partner_name TEXT NOT NULL,
  partner_membership_no TEXT NOT NULL,
  firm_reg_no TEXT,
  udin TEXT,
  qualification_notes TEXT,
  legal_disclaimer TEXT,
  signed_at TIMESTAMPTZ,
  pdf_storage_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid multi-tenant filtering
CREATE INDEX IF NOT EXISTS idx_audit_dossiers_firm_client 
  ON public.audit_dossiers (firm_id, client_id);

CREATE INDEX IF NOT EXISTS idx_audit_dossiers_fy 
  ON public.audit_dossiers (financial_year);

CREATE INDEX IF NOT EXISTS idx_audit_dossiers_status 
  ON public.audit_dossiers (report_status);

-- Enable RLS
ALTER TABLE public.audit_dossiers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Select
DROP POLICY IF EXISTS "Firm members can view firm audit dossiers" ON public.audit_dossiers;
CREATE POLICY "Firm members can view firm audit dossiers"
  ON public.audit_dossiers
  FOR SELECT
  USING (
    firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
    OR auth.uid() IS NULL -- Fallback for service role / local demo
  );

-- RLS Policy: Insert
DROP POLICY IF EXISTS "Firm members can create audit dossiers" ON public.audit_dossiers;
CREATE POLICY "Firm members can create audit dossiers"
  ON public.audit_dossiers
  FOR INSERT
  WITH CHECK (
    firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  );

-- RLS Policy: Update
DROP POLICY IF EXISTS "Firm members can update audit dossiers" ON public.audit_dossiers;
CREATE POLICY "Firm members can update audit dossiers"
  ON public.audit_dossiers
  FOR UPDATE
  USING (
    firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  );

-- RLS Policy: Delete
DROP POLICY IF EXISTS "Firm admins can delete audit dossiers" ON public.audit_dossiers;
CREATE POLICY "Firm admins can delete audit dossiers"
  ON public.audit_dossiers
  FOR DELETE
  USING (
    firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR auth.uid() IS NULL
  );
