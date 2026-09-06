import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { ClientWorkspaceClient, ClientDetail } from './ClientWorkspaceClient';
import { Uploader } from '@/components/documents/Uploader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientWorkspacePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Fetch firm membership - Get the current user's REAL firm_id
  const { data: firmUser, error: membershipError } = await supabase
    .from('firm_users')
    .select('firm_id')
    .eq('user_id', user.id)
    .single();

  const realFirmId = firmUser?.firm_id;

  if (!realFirmId || membershipError) {
    redirect('/onboarding');
  }

  // 3. Fetch Firm Details
  const { data: firm } = await supabase
    .from('firms')
    .select('id, name')
    .eq('id', realFirmId)
    .single();

  const firmName = firm?.name || 'CA Practice';

  // 4. Fetch Client record verifying firm partition (extracting real UUIDs)
  let client: ClientDetail | null = null;

  try {
    const { data: clientRow, error: clientError } = await supabase
      .from('clients')
      .select('id, firm_id, name, gstin, pan, created_at')
      .eq('id', id)
      .eq('firm_id', realFirmId)
      .maybeSingle();

    if (!clientError && clientRow) {
      client = {
        ...clientRow,
        firm_id: clientRow.firm_id || realFirmId,
      };
    }
  } catch (err) {
    console.error('Error fetching client:', err);
  }

  // If client record not found, redirect back to clients list
  if (!client) {
    redirect('/dashboard/clients');
  }

  // 5. Fetch documents for this client partitioned by firm
  let initialDocuments: any[] = [];
  try {
    const { data: docRows, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', id)
      .eq('firm_id', realFirmId)
      .order('created_at', { ascending: false });

    if (!docError && docRows && docRows.length > 0) {
      initialDocuments = docRows.map((row: any) => ({
        id: row.id,
        client_id: row.client_id,
        firm_id: row.firm_id,
        storage_path: row.storage_path || row.file_path || '',
        doc_type: row.doc_type || row.document_type || 'Document',
        period_month: row.period_month ?? row.month ?? 10,
        period_year: row.period_year ?? row.year ?? 2023,
        file_name: row.file_name || (row.storage_path ? row.storage_path.split('/').pop() : 'document'),
        file_size: row.file_size || 0,
        status: row.status || 'uploaded',
        created_at: row.created_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.error('Error querying documents table:', err);
  }

  return (
    <ClientWorkspaceClient
      client={client}
      firmName={firmName}
      firmId={realFirmId}
      initialDocuments={initialDocuments}
      uploader={<Uploader clientId={client.id} firmId={realFirmId} />}
    />
  );
}
