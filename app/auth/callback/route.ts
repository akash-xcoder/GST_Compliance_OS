import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const errorDescription = searchParams.get('error_description') || searchParams.get('error');

  if (errorDescription) {
    console.error('OAuth provider error:', errorDescription);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.user) {
        // Verify if user already belongs to a firm
        const { data: membership } = await supabase
          .from('firm_users')
          .select('firm_id')
          .eq('user_id', data.user.id)
          .maybeSingle();

        // If user has a firm, route to destination; otherwise route to onboarding wizard
        const destination = membership?.firm_id ? next : '/onboarding';

        const forwardedHost = request.headers.get('x-forwarded-host');
        if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${destination}`);
        }
        return NextResponse.redirect(`${origin}${destination}`);
      }

      if (error) {
        console.error('Error exchanging code for session:', error.message);
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(error.message || 'Authentication failed')}`
        );
      }
    } catch (err: any) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(err?.message || 'Authentication error')}`
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid%20or%20missing%20OAuth%20code`);
}
