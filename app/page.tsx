import Link from 'next/link';
import { ArrowRight, FileSpreadsheet, Users, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* Top Header */}
      <header className="w-full border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-sm">
              <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
            </div>
            <div className="flex items-center">
              <span className="text-xl font-bold tracking-tight text-slate-800">GST Compliance OS</span>
              <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded uppercase tracking-wider">
                CA Enterprise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span>Supabase Connected</span>
            </div>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold">
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & Overview */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6 uppercase tracking-wider">
            <span>Built Exclusively for Chartered Accountant (CA) Firms</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight mb-6">
            Multi-Tenant Operating System for GST Compliance & Reconciliations
          </h1>

          <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Manage multi-entity clients, centralize purchase and sales registers, run deterministic GSTR-2B vs. Books reconciliations, and automate client communication in one workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-base px-6 font-semibold shadow-sm">
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-white text-base font-semibold">
                Sign In to CA Portal
              </Button>
            </Link>
          </div>

          {/* Architecture Capabilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left border-t border-slate-200 pt-10">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 font-bold">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-slate-900 text-sm mb-1">Multi-Tenant CA Hierarchy</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Complete isolation between CA firms, audit teams, and client organizations with row-level security.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 font-bold">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-slate-900 text-sm mb-1">Deterministic GST Recon</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Rules engine for invoice matching across GSTR-2B, GSTR-1, and ERP purchase registers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 font-bold">
                <Cpu className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-slate-900 text-sm mb-1">Document Ingestion & AI</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Structured OCR pipeline for invoices, receipts, and vendor statements with audit trails.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-500">
          GST Compliance OS &bull; Phase 1 Architecture Foundation &bull; Next.js App Router & Supabase SSR
        </div>
      </footer>
    </div>
  );
}
