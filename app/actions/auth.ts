'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  message?: string;
}

/**
 * Server Action: User Registration (Sign Up)
 * Handles firm partner/practitioner registration, optional initial firm creation,
 * and sets up authenticated session.
 */
export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const fullName = (formData.get('fullName') as string)?.trim() || '';
  const firmName = (formData.get('firmName') as string)?.trim() || '';

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid work or CA firm email address.' };
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        firm_name: firmName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (!user) {
    return {
      success: true,
      message: 'Account created. Please verify your email or sign in.',
    };
  }

  // If user provided a firmName during signup, pre-create the firm
  if (firmName) {
    try {
      const { data: newFirm, error: firmErr } = await supabase
        .from('firms')
        .insert({ name: firmName })
        .select('id')
        .single();

      if (!firmErr && newFirm?.id) {
        await supabase.from('firm_users').insert({
          firm_id: newFirm.id,
          user_id: user.id,
          role: 'owner',
        });
      }
    } catch (firmCreateErr) {
      console.warn('Could not auto-create firm during signup:', firmCreateErr);
    }
  }

  // Redirect newly registered user to zero-state onboarding
  redirect('/dashboard/onboarding');
}

/**
 * Server Action: User Login (Sign In)
 * Authenticates user credentials with Supabase Auth, inspects firm & client state,
 * and navigates to the dashboard or zero-state onboarding.
 */
export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' };
  }

  if (!password) {
    return { error: 'Password is required.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  if (!user) {
    return { error: 'Authentication failed. Please check your credentials.' };
  }

  // Check if user has an active firm and at least one client
  try {
    const { data: membership } = await supabase
      .from('firm_users')
      .select('firm_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership?.firm_id) {
      redirect('/dashboard/onboarding');
    }

    const { count: cCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', membership.firm_id);

    // If no clients registered under this firm yet, guide to zero-state onboarding
    if (cCount === 0) {
      redirect('/dashboard/onboarding');
    }
  } catch (checkErr: unknown) {
    if (checkErr instanceof Error && checkErr.message.includes('NEXT_REDIRECT')) {
      throw checkErr;
    }
    // Fall through to dashboard if query fails
  }

  redirect('/dashboard');
}

// Alias for convenience
export const login = signIn;

/**
 * Server Action: Logout (Sign Out)
 * Terminates session and redirects to /login.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// Alias for convenience
export const logout = signOut;

/**
 * Server Action: Get authenticated user
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
