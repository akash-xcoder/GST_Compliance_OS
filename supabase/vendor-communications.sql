-- ==============================================================================
-- GST AI Compliance Studio: Vendor Communications & Legal Notices Schema
-- PROMPT 9: Automated Vendor Communication & Legal Notice Generator
-- ==============================================================================

-- 1. Create vendor_communications table
CREATE TABLE IF NOT EXISTS public.vendor_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  supplier_gstin VARCHAR(15) NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_email TEXT,
  supplier_phone TEXT,
  communication_type VARCHAR(40) NOT NULL CHECK (
    communication_type IN ('email_advisory', 'urgent_reminder', 'legal_notice', 'phone_log', 'settlement_demand')
  ),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  reference_number VARCHAR(80),
  legal_sections TEXT[] DEFAULT ARRAY['Section 16(2)(aa)', 'Section 16(2)(c)', 'Rule 36(4)', 'Section 50']::TEXT[],
  invoices JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_tax_at_risk NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  recipient_email TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'delivered', 'vendor_acknowledged', 'disputed', 'resolved')
  ),
  dispatch_mode VARCHAR(30) DEFAULT 'email' CHECK (
    dispatch_mode IN ('email', 'speed_post', 'registered_post', 'courier', 'hand_delivery', 'portal')
  ),
  tracking_reference TEXT,
  sent_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  sent_by_name TEXT,
  cure_period_days INTEGER DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_vendor_comm_client_supplier 
  ON public.vendor_communications(client_id, supplier_gstin);

CREATE INDEX IF NOT EXISTS idx_vendor_comm_firm_created 
  ON public.vendor_communications(firm_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_comm_status 
  ON public.vendor_communications(status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.vendor_communications ENABLE ROW LEVEL SECURITY;

-- 4. Policies for firm members
DROP POLICY IF EXISTS "Firm users can view vendor communications" ON public.vendor_communications;
CREATE POLICY "Firm users can view vendor communications"
ON public.vendor_communications
FOR SELECT
TO authenticated
USING (
  firm_id IN (
    SELECT firm_id 
    FROM public.firm_users 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Firm users can create vendor communications" ON public.vendor_communications;
CREATE POLICY "Firm users can create vendor communications"
ON public.vendor_communications
FOR INSERT
TO authenticated
WITH CHECK (
  firm_id IN (
    SELECT firm_id 
    FROM public.firm_users 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Firm users can update vendor communications" ON public.vendor_communications;
CREATE POLICY "Firm users can update vendor communications"
ON public.vendor_communications
FOR UPDATE
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
