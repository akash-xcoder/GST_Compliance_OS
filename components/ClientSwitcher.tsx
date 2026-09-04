'use client';

import React from 'react';
import { useClient } from '@/context/ClientContext';
import { useRouter, usePathname } from 'next/navigation';

export interface ClientSwitcherProps {
  className?: string;
  onOpenNewClientModal?: () => void;
}

export default function ClientSwitcher({ className = '', onOpenNewClientModal }: ClientSwitcherProps = {}) {
  const { currentClient, setCurrentClient, clients } = useClient();
  
  let router: any = null;
  let pathname = '';
  try {
    router = useRouter();
    pathname = usePathname() || '';
  } catch {
    // Graceful fallback if outside Next router
    if (typeof window !== 'undefined') {
      pathname = window.location.pathname;
    }
  }

  return (
    <div
      id="client-switcher-container"
      className={`flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg shadow-sm ${className}`}
    >
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
        Active Client:
      </span>
      <select
        id="client-switcher-select"
        aria-label="Active Client Selection"
        className="bg-slate-800 text-white text-sm font-medium rounded px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[220px] sm:max-w-xs md:max-w-sm truncate border border-slate-700 cursor-pointer"
        value={currentClient?.id || ''}
        onChange={(e) => {
          const selected = clients.find((c) => c.id === e.target.value);
          if (selected) {
            setCurrentClient(selected);
            if (pathname && pathname.startsWith('/dashboard/clients/')) {
              router.push(`/dashboard/clients/${selected.id}`);
            }
          }
        }}
      >
        {clients.map((client) => (
          <option key={client.id} value={client.id} className="bg-slate-900 text-white">
            {client.name} ({client.gstin})
          </option>
        ))}
      </select>
    </div>
  );
}

export { ClientSwitcher };
