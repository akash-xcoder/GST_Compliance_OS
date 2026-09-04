import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { SidebarNav } from '@/components/SidebarNav';
import { LogOutButton } from '@/components/LogOutButton';
import { Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Check if current user exists in `firm_users`
  const { data: membership, error: membershipError } = await supabase
    .from('firm_users')
    .select('firm_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  // If they do NOT exist in firm_users, redirect them to /onboarding
  if (!membership || membershipError) {
    redirect('/onboarding');
  }

  // 3. If they do exist, fetch firm_id and firm name
  const { data: firm } = await supabase
    .from('firms')
    .select('id, name')
    .eq('id', membership.firm_id)
    .single();

  const firmName = firm?.name || 'CA Practice Workspace';
  const role = membership.role || 'owner';

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 antialiased">
      {/* Left Sidebar Shell */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen sticky top-0 h-screen">
        <SidebarNav firmName={firmName} role={role} />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                {firmName}
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded uppercase tracking-wider">
                CA Enterprise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user.email && (
              <span className="hidden md:inline-block text-xs text-slate-500 font-medium">
                {user.email}
              </span>
            )}
            <LogOutButton />
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 p-6 sm:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
