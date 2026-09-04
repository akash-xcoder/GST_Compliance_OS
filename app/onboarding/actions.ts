'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function createFirm(formData: FormData) {
  const firmName = ((formData.get('firmName') || formData.get('name')) as string)?.trim();

  if (!firmName) {
    return { error: 'CA Firm Name is required.' };
  }

  const supabase = await createClient();

  // a) Get current authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  // b) Insert a new row into the `firms` table with the provided firm name
  const { data: firm, error: firmError } = await supabase
    .from('firms')
    .insert({ name: firmName })
    .select('id, name')
    .single();

  if (firmError || !firm) {
    console.error('Error creating firm:', firmError);
    return { error: firmError?.message || 'Failed to create firm. Please try again.' };
  }

  // c) Insert a new row into the `firm_users` table linking the user to this new firm with the role 'owner'
  const { error: firmUserError } = await supabase
    .from('firm_users')
    .insert({
      firm_id: firm.id,
      user_id: user.id,
      role: 'owner',
    });

  if (firmUserError) {
    console.error('Error linking user to firm:', firmUserError);
    return { error: firmUserError.message || 'Failed to link user to firm. Please try again.' };
  }

  // d) Redirect the user to `/dashboard`
  redirect('/dashboard');
}
