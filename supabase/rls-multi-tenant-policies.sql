-- ==============================================================================
-- Supabase Row Level Security (RLS) Policies: Multi-Tenant Firm Isolation
-- Tables: firms, firm_users, clients, documents, invoices
-- ==============================================================================

-- 1. Enable Row Level Security on all 5 core tables
ALTER TABLE IF EXISTS public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.firm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. `firm_users` Policies
-- A user can only select/insert/update/delete rows where user_id matches auth.uid()
-- ==============================================================================
DROP POLICY IF EXISTS "firm_users_select_own" ON public.firm_users;
CREATE POLICY "firm_users_select_own" ON public.firm_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "firm_users_insert_own" ON public.firm_users;
CREATE POLICY "firm_users_insert_own" ON public.firm_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "firm_users_update_own" ON public.firm_users;
CREATE POLICY "firm_users_update_own" ON public.firm_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "firm_users_delete_own" ON public.firm_users;
CREATE POLICY "firm_users_delete_own" ON public.firm_users
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==============================================================================
-- 3. `firms` Policies
-- A user can only view/update a firm if they are a member of it (linked via firm_users).
-- Authenticated users are permitted to INSERT so new firms can be created during signup.
-- ==============================================================================
DROP POLICY IF EXISTS "firms_select_member" ON public.firms;
CREATE POLICY "firms_select_member" ON public.firms
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT firm_id 
      FROM public.firm_users 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "firms_insert_authenticated" ON public.firms;
CREATE POLICY "firms_insert_authenticated" ON public.firms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "firms_update_member" ON public.firms;
CREATE POLICY "firms_update_member" ON public.firms
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT firm_id 
      FROM public.firm_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT firm_id 
      FROM public.firm_users 
      WHERE user_id = auth.uid()
    )
  );

-- ==============================================================================
-- 4. `clients` Policies
-- A user can only CRUD clients if the firm_id matches a firm the user belongs to.
-- ==============================================================================
DROP POLICY IF EXISTS "clients_tenant_isolation" ON public.clients;
CREATE POLICY "clients_tenant_isolation" ON public.clients
  FOR ALL
  TO authenticated
  USING (
    firm_id IN (
      SELECT firm_id 
      FROM public.firm_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    firm_id IN (
      SELECT firm_id 
      FROM public.firm_users 
      WHERE user_id = auth.uid()
    )
  );

-- ==============================================================================
-- 5. `documents` Policies
-- A user can only CRUD documents if the firm_id matches a firm the user belongs to.
-- ==============================================================================
DROP POLICY IF EXISTS "documents_tenant_isolation" ON public.documents;
CREATE POLICY "documents_tenant_isolation" ON public.documents
  FOR ALL
  TO authenticated
  USING (
    firm_id IN (
      SELECT firm_id 
      FROM public.firm_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    firm_id IN (
      SELECT firm_id 
      FROM public.firm_users 
      WHERE user_id = auth.uid()
    )
  );

-- ==============================================================================
-- 6. `invoices` Policies
-- A user can only CRUD invoices if the firm_id matches a firm the user belongs to.
-- ==============================================================================
DROP POLICY IF EXISTS "invoices_tenant_isolation" ON public.invoices;
CREATE POLICY "invoices_tenant_isolation" ON public.invoices
  FOR ALL
  TO authenticated
  USING (
    firm_id IN (
      SELECT firm_id 
      FROM public.firm_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    firm_id IN (
      SELECT firm_id 
      FROM public.firm_users 
      WHERE user_id = auth.uid()
    )
  );
