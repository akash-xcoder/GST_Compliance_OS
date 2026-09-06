'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { validateGSTIN, extractPANFromGSTIN, validatePAN } from '@/lib/validations/gst';
import { revalidatePath } from 'next/cache';

export interface OnboardingResult {
  error?: string;
  success?: boolean;
  message?: string;
}

/**
 * Server Action: Completes first-run onboarding.
 * Ensures the CA Firm is registered, user is linked as 'owner',
 * and the first client organization is registered with a verified GSTIN & PAN.
 */
export async function completeOnboarding(formData: FormData): Promise<OnboardingResult> {
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  // 2. Extract firm details
  const firmName = ((formData.get('firmName') || formData.get('name')) as string)?.trim();
  const partnerName = (formData.get('partnerName') as string)?.trim();
  const frn = (formData.get('frn') as string)?.trim();

  // 3. Extract client details
  const clientName = (formData.get('clientName') as string)?.trim();
  const clientGstin = (formData.get('clientGstin') as string)?.trim().toUpperCase();
  let clientPan = (formData.get('clientPan') as string)?.trim().toUpperCase();

  if (!firmName) {
    return { error: 'CA Firm Name is required.' };
  }

  if (!clientName) {
    return { error: 'First Client Business Name is required to initialize workspace.' };
  }

  if (!clientGstin) {
    return { error: 'Client GSTIN is required.' };
  }

  if (!validateGSTIN(clientGstin)) {
    return {
      error: 'Invalid GSTIN format. Must be 15 characters (e.g. 27AAAAA0000A1Z5).',
    };
  }

  if (!clientPan) {
    clientPan = extractPANFromGSTIN(clientGstin);
  }

  if (!validatePAN(clientPan)) {
    return {
      error: 'Invalid PAN format. Must be 10 alphanumeric characters (e.g. AAAAA0000A).',
    };
  }

  // 4. Check if user already belongs to a firm
  let firmId: string | null = null;
  const { data: existingMembership } = await supabase
    .from('firm_users')
    .select('firm_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMembership?.firm_id) {
    firmId = existingMembership.firm_id;
  } else {
    // Create new firm
    const { data: newFirm, error: firmCreateError } = await supabase
      .from('firms')
      .insert({ name: firmName })
      .select('id')
      .single();

    if (firmCreateError || !newFirm) {
      return { error: firmCreateError?.message || 'Failed to create CA Firm profile.' };
    }

    firmId = newFirm.id;

    // Link user to firm
    const { error: linkError } = await supabase.from('firm_users').insert({
      firm_id: firmId,
      user_id: user.id,
      role: 'owner',
    });

    if (linkError) {
      return { error: linkError.message || 'Failed to associate user with CA firm.' };
    }
  }

  // 5. Insert first client organization
  const { data: newClient, error: clientInsertError } = await supabase
    .from('clients')
    .insert({
      firm_id: user.id,
      user_id: user.id,
      name: clientName,
      gstin: clientGstin,
      pan: clientPan,
    })
    .select('id')
    .single();

  if (clientInsertError) {
    if (clientInsertError.code === '23505' || clientInsertError.message.includes('unique')) {
      return {
        error: `A client with GSTIN ${clientGstin} is already registered.`,
      };
    }
    return {
      error: clientInsertError.message || 'Failed to register client organization.',
    };
  }

  // 6. Revalidate dashboard caches
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/clients');
  revalidatePath('/dashboard/onboarding');

  redirect('/dashboard');
}
