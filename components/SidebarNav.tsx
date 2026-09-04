'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, FileSpreadsheet } from 'lucide-react';

interface SidebarNavProps {
  firmName?: string;
  role?: string;
}

export function SidebarNav({ firmName = 'CA Practice', role = 'owner' }: SidebarNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      label: 'Clients',
      href: '/dashboard/clients',
      icon: Users,
      active: pathname.startsWith('/dashboard/clients'),
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

        {/* Security & RLS Partition Status Card */}
        <div className="mt-auto p-3.5 bg-slate-900 text-white rounded-xl">
          <div className="text-[11px] font-semibold text-indigo-400 mb-0.5 uppercase tracking-wider">
            RLS Protected
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            All data isolated to {firmName}.
          </p>
        </div>
      </div>
    </div>
  );
}
