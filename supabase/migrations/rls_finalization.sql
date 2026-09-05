-- Prompt 13: Database RLS Finalization
-- Ensures all multi-tenant tables enforce strict tenant separation and user isolation
-- auth.uid() = user_id OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid())

-- 1. Ensure user_id column exists on public.clients
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Enable Row Level Security on all core tables
ALTER TABLE IF EXISTS public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.firm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.extraction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.statutory_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.department_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notice_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_dossiers ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies on firms and firm_users
DROP POLICY IF EXISTS "firm_users_select_own" ON public.firm_users;
CREATE POLICY "firm_users_select_own" ON public.firm_users
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "firm_users_insert_own" ON public.firm_users;
CREATE POLICY "firm_users_insert_own" ON public.firm_users
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "firms_select_member" ON public.firms;
CREATE POLICY "firms_select_member" ON public.firms
  FOR SELECT USING (
    id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "firms_insert_authenticated" ON public.firms;
CREATE POLICY "firms_insert_authenticated" ON public.firms
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "firms_update_owner" ON public.firms;
CREATE POLICY "firms_update_owner" ON public.firms
  FOR UPDATE USING (
    id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid() AND role = 'owner')
  );

-- 4. RLS Policies on clients
DROP POLICY IF EXISTS "clients_select_tenant" ON public.clients;
CREATE POLICY "clients_select_tenant" ON public.clients
  FOR SELECT USING (
    user_id = auth.uid() OR
    firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "clients_insert_tenant" ON public.clients;
CREATE POLICY "clients_insert_tenant" ON public.clients
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "clients_update_tenant" ON public.clients;
CREATE POLICY "clients_update_tenant" ON public.clients
  FOR UPDATE USING (
    user_id = auth.uid() OR
    firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "clients_delete_tenant" ON public.clients;
CREATE POLICY "clients_delete_tenant" ON public.clients
  FOR DELETE USING (
    user_id = auth.uid() OR
    firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid() AND role = 'owner')
  );

-- 5. RLS Policies on invoices
DROP POLICY IF EXISTS "invoices_tenant_isolation" ON public.invoices;
CREATE POLICY "invoices_tenant_isolation" ON public.invoices
  FOR ALL USING (
    firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()) OR
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()) OR
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
  );

-- 6. RLS Policies on documents
DROP POLICY IF EXISTS "documents_tenant_isolation" ON public.documents;
CREATE POLICY "documents_tenant_isolation" ON public.documents
  FOR ALL USING (
    firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()) OR
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()) OR
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
  );

-- 7. RLS Policies on department_notices & notice_replies
DROP POLICY IF EXISTS "notices_tenant_isolation" ON public.department_notices;
CREATE POLICY "notices_tenant_isolation" ON public.department_notices
  FOR ALL USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "replies_tenant_isolation" ON public.notice_replies;
CREATE POLICY "replies_tenant_isolation" ON public.notice_replies
  FOR ALL USING (
    notice_id IN (
      SELECT id FROM public.department_notices 
      WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
    )
  )
  WITH CHECK (
    notice_id IN (
      SELECT id FROM public.department_notices 
      WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
    )
  );

-- 8. RLS Policies on statutory_filings
DROP POLICY IF EXISTS "filings_tenant_isolation" ON public.statutory_filings;
CREATE POLICY "filings_tenant_isolation" ON public.statutory_filings
  FOR ALL USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
  );

-- 9. RLS Policies on audit_dossiers
DROP POLICY IF EXISTS "dossiers_tenant_isolation" ON public.audit_dossiers;
CREATE POLICY "dossiers_tenant_isolation" ON public.audit_dossiers
  FOR ALL USING (
    firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()) OR
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()) OR
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid() OR firm_id IN (SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()))
  );
