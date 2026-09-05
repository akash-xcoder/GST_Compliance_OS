import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { ClientListClient, ClientItem } from './ClientListClient';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Fetch user's firm
  const { data: membership, error: membershipError } = await supabase
    .from('firm_users')
    .select('firm_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membershipError) {
    redirect('/dashboard/onboarding');
  }

  // 3. Fetch Firm Details
  const { data: firm } = await supabase
    .from('firms')
    .select('id, name')
    .eq('id', membership.firm_id)
    .single();

  const firmName = firm?.name || 'CA Practice Workspace';

  // 4. Fetch Clients strictly for this firm
  let clients: ClientItem[] = [];

  try {
    const { data: clientRows, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, gstin, pan, created_at')
      .eq('firm_id', membership.firm_id)
      .order('created_at', { ascending: false });

    if (!clientsError && clientRows) {
      clients = clientRows;
    }
  } catch (err) {
    console.warn('Notice fetching clients:', err);
  }

  return <ClientListClient initialClients={clients} firmName={firmName} />;
}
