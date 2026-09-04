'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';

export function LogOutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleSignOut() {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Error signing out:', err);
      router.push('/login');
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
