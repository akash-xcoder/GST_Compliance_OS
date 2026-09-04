import React from 'react';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 font-sans text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-sm">
            <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
          </div>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          GST Compliance OS
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          CA Firm Multi-Tenant Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
}
