'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';

export function LogOutButton() {
  let router: any = null;
  try {
    router = useRouter();
  } catch {
    // Fallback if router context is unmounted
  }
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleSignOut() {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      if (router?.push) {
        router.push('/login');
        router.refresh?.();
      } else if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Error signing out:', err);
      if (router?.push) {
        router.push('/login');
      } else if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={isLoggingOut}
      className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-slate-200 gap-1.5 text-xs font-semibold shadow-xs"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>{isLoggingOut ? 'Signing out...' : 'Log Out'}</span>
    </Button>
  );
}
