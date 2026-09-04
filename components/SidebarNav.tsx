'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, FileSpreadsheet, Building2, CheckCircle2, Mail, Scale, CalendarClock, FileCheck } from 'lucide-react';
import { useClient } from '@/context/ClientContext';

interface SidebarNavProps {
  firmName?: string;
  role?: string;
}

export function SidebarNav({ firmName = 'CA Practice', role = 'owner' }: SidebarNavProps) {
  let pathname = '';
  try {
    pathname = usePathname() || '';
  } catch {
    if (typeof window !== 'undefined') {
      pathname = window.location.pathname;
    }
  }
  const { selectedClient } = useClient();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      label: 'Compliance Tracker',
      href: '/dashboard/compliance',
      icon: CalendarClock,
      active: pathname.startsWith('/dashboard/compliance'),
    },
    {
      label: 'Clients',
      href: '/dashboard/clients',
      icon: Users,
      active: pathname.startsWith('/dashboard/clients') && !pathname.includes('/clients/'),
    },
    {
      label: 'Documents',
      href: '/dashboard/documents',
      icon: FileText,
      active: pathname.startsWith('/dashboard/documents'),
    },
    {
      label: 'Reconciliation',
      href: '/dashboard/reconciliation',
      icon: FileSpreadsheet,
      active: pathname.startsWith('/dashboard/reconciliation'),
    },
    {
      label: 'Vendor Notices',
      href: '/dashboard/communications',
      icon: Mail,
      active: pathname.startsWith('/dashboard/communications'),
    },
    {
      label: 'Scrutiny & ASMT-10',
      href: '/dashboard/scrutiny',
      icon: Scale,
      active: pathname.startsWith('/dashboard/scrutiny'),
    },
    {
      label: 'Audit Reports & Dossiers',
      href: '/dashboard/reports',
      icon: FileCheck,
      active: pathname.startsWith('/dashboard/reports'),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Brand & Workspace info */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-sm shrink-0">
            <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 text-sm tracking-tight truncate leading-tight">
              {firmName}
            </h1>
            <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded uppercase tracking-wider">
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="p-3 flex-1 flex flex-col gap-1">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${item.active ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Active Client Workspace Context Card */}
        {selectedClient && (
          <div className="mt-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                Scoped Client
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <Link
              href={`/dashboard/clients/${selectedClient.id}`}
              className="block group"
            >
              <div className="font-semibold text-xs text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                {selectedClient.name}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                {selectedClient.gstin}
              </div>
            </Link>
          </div>
        )}

        {/* Security & RLS Partition Status Card */}
        <div className="mt-auto p-3.5 bg-slate-900 text-white rounded-xl">
          <div className="text-[11px] font-semibold text-indigo-400 mb-0.5 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>RLS Protected</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            All data isolated to {firmName}.
          </p>
        </div>
      </div>
    </div>
  );
}

