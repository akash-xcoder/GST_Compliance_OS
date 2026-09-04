'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { validateGSTIN, extractPANFromGSTIN, validatePAN } from '@/lib/validations/gst';

export interface ActionState {
  error?: string;
  success?: boolean;
  message?: string;
  clientId?: string;
}

export async function createClientAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: 'Authentication required. Please sign in again.' };
    }

    // 2. Fetch user's firm membership
    const { data: membership, error: membershipError } = await supabase
      .from('firm_users')
      .select('firm_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError || !membership?.firm_id) {
      return { error: 'No active CA firm associated with your account. Please complete onboarding.' };
    }

    const firmId = membership.firm_id;

    // 3. Extract and sanitize form values
    const name = (formData.get('name') as string)?.trim();
    const rawGstin = (formData.get('gstin') as string)?.trim().toUpperCase();
    let rawPan = (formData.get('pan') as string)?.trim().toUpperCase();

    if (!name) {
      return { error: 'Client business name is required.' };
    }

    if (!rawGstin) {
      return { error: 'GSTIN is required.' };
    }

    // 4. Validate GSTIN
    if (!validateGSTIN(rawGstin)) {
      return {
        error: 'Invalid GSTIN format. Must be 15 characters (e.g. 27AAAAA0000A1Z5).',
      };
    }

    // 5. Derive or validate PAN
    if (!rawPan) {
      rawPan = extractPANFromGSTIN(rawGstin);
    }

    if (!validatePAN(rawPan)) {
      return {
        error: 'Invalid PAN format. Must be 10 characters (e.g. AAAAA0000A).',
      };
    }

    // 6. Insert client into `clients` table
    const { data: client, error: insertError } = await supabase
      .from('clients')
      .insert({
        firm_id: firmId,
        name,
        gstin: rawGstin,
        pan: rawPan,
      })
      .select('id')
      .single();

    if (insertError) {
      // Check for uniqueness constraint violation (Postgres error 23505)
      if (insertError.code === '23505' || insertError.message.includes('unique')) {
        return {
          error: `A client with GSTIN ${rawGstin} is already registered under your firm.`,
        };
      }
      return {
        error: insertError.message || 'Failed to create client organization. Please try again.',
      };
    }

    // 7. Revalidate clients list
    revalidatePath('/dashboard/clients');

    return {
      success: true,
      message: `Client "${name}" created successfully.`,
      clientId: client.id,
    };
  } catch (err: any) {
    return {
      error: err?.message || 'An unexpected server error occurred.',
    };
  }
}

export async function deleteClient(clientId: string): Promise<ActionState> {
  try {
    if (!clientId) {
      return { error: 'Invalid client ID specified.' };
    }

    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: 'Authentication required. Please sign in again.' };
    }

    // 2. Fetch user's firm membership
    const { data: membership, error: membershipError } = await supabase
      .from('firm_users')
      .select('firm_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError || !membership?.firm_id) {
      return { error: 'Unauthorized: No active firm membership found.' };
    }

    // 3. Delete client strictly partitioned by firm_id
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('firm_id', membership.firm_id);

    if (deleteError) {
      return { error: deleteError.message || 'Failed to remove client.' };
    }

    // 4. Revalidate
    revalidatePath('/dashboard/clients');

    return {
      success: true,
      message: 'Client removed successfully.',
    };
  } catch (err: any) {
    return {
      error: err?.message || 'An unexpected error occurred while deleting the client.',
    };
  }
}
