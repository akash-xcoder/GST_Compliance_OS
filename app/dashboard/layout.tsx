import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { SidebarNav } from '@/components/SidebarNav';
import { LogOutButton } from '@/components/LogOutButton';
import { ClientSwitcher } from '@/components/ClientSwitcher';
import { ClientProvider } from '@/context/ClientContext';
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

  // 4. Fetch initial clients for this firm to seed the ClientProvider
  let initialClients: any[] = [];
  try {
    const { data: clientRows } = await supabase
      .from('clients')
      .select('id, firm_id, name, gstin, pan, created_at')
      .eq('firm_id', membership.firm_id)
      .order('created_at', { ascending: false });

    if (clientRows && clientRows.length > 0) {
      initialClients = clientRows;
    }
  } catch (clientErr) {
    console.warn('Notice fetching initial clients for provider:', clientErr);
  }

  return (
    <ClientProvider
      initialFirmId={membership.firm_id}
      initialFirmName={firmName}
      initialClients={initialClients.length > 0 ? initialClients : undefined}
    >
      <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 antialiased">
        {/* Left Sidebar Shell */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen sticky top-0 h-screen">
          <SidebarNav firmName={firmName} role={role} />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header with Client Switcher */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="hidden lg:flex items-center gap-2 min-w-0">
                <h1 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                  {firmName}
                </h1>
                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded uppercase tracking-wider shrink-0">
                  CA Firm
                </span>
              </div>
            </div>

            {/* Central Client Workspace Switcher */}
            <div className="flex-1 max-w-md flex justify-center">
              <ClientSwitcher />
            </div>

            {/* Right Action Tools & User Profile */}
            <div className="flex items-center gap-3 shrink-0">
              {user.email && (
                <span className="hidden xl:inline-block text-xs text-slate-500 font-medium truncate max-w-[160px]">
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
    </ClientProvider>
  );
}

