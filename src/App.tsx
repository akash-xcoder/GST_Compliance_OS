import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Users,
  FileSpreadsheet,
  FileText,
  History,
  Settings,
  LogOut,
  Building2,
  Lock,
  Mail,
  User,
  Database,
  CheckCircle2,
  Cpu,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  AlertCircle,
  X,
  CreditCard,
  Hash,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Upload,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  HardDrive,
  Layers,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateGSTIN, extractPANFromGSTIN, validatePAN } from '@/lib/validations/gst';
import { ReconciliationView } from '@/components/reconciliation/ReconciliationView';
import { Uploader } from '@/components/documents/Uploader';
import { createClient } from '@/utils/supabase/client';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'login' | 'signup' | 'onboarding' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'documents' | 'reconciliation'>('dashboard');
  const [firmName, setFirmName] = useState('Kapur & Associates, CAs');
  const [onboardingInput, setOnboardingInput] = useState('');
  const [onboardingError, setOnboardingError] = useState('');

  // Valid DB UUIDs default
  const [realFirmId, setRealFirmId] = useState<string>('a763af2b-c7ea-4a56-b448-513df5ca0dfa');

  // Client Management States
  const [clientsList, setClientsList] = useState([
    {
      id: '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca',
      name: 'Acme Manufacturing Ltd.',
      gstin: '27AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      created_at: '2023-10-15T00:00:00.000Z',
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Horizon Logistics LLP',
      gstin: '19BBBBB1111B2Z6',
      pan: 'BBBBB1111B',
      created_at: '2023-10-01T00:00:00.000Z',
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Stellar Global Solutions',
      gstin: '08CCCCC2222C3Z7',
      pan: 'CCCCC2222C',
      created_at: '2023-09-18T00:00:00.000Z',
    },
  ]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientWorkspaceTab, setClientWorkspaceTab] = useState<'overview' | 'documents' | 'reconciliation'>('overview');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientGstin, setNewClientGstin] = useState('');
  const [newClientPan, setNewClientPan] = useState('');
  const [addClientError, setAddClientError] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Document Management State
  interface AppDocument {
    id: string;
    client_id: string;
    firm_id: string;
    storage_path: string;
    doc_type: string;
    period_month: number;
    period_year: number;
    file_name: string;
    file_size: number;
    status: string;
    created_at: string;
  }

  const [documents, setDocuments] = useState<AppDocument[]>([
    {
      id: 'doc-1',
      client_id: '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca',
      firm_id: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
      storage_path: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa/7ed6ea05-df68-49a4-bfa4-aeaba84d29ca/2023/10/purchase_register_1697112000000_PR_Oct2023_Final.xlsx',
      doc_type: 'Purchase Register',
      period_month: 10,
      period_year: 2023,
      file_name: 'PR_Oct2023_Final.xlsx',
      file_size: 245760,
      status: 'uploaded',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'doc-2',
      client_id: '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca',
      firm_id: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
      storage_path: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa/7ed6ea05-df68-49a4-bfa4-aeaba84d29ca/2023/10/gstr_2b_1697198400000_GSTR2B_Oct2023_Portal.json',
      doc_type: 'GSTR-2B',
      period_month: 10,
      period_year: 2023,
      file_name: 'GSTR2B_Oct2023_Portal.json',
      file_size: 512000,
      status: 'uploaded',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'doc-3',
      client_id: '00000000-0000-0000-0000-000000000003',
      firm_id: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
      storage_path: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa/00000000-0000-0000-0000-000000000003/2023/10/sales_register_1697284800000_Sales_Oct23.xlsx',
      doc_type: 'Sales Register',
      period_month: 10,
      period_year: 2023,
      file_name: 'Sales_Oct23.xlsx',
      file_size: 184320,
      status: 'uploaded',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ]);

  // Load real firm_id, clients, and documents from Supabase
  React.useEffect(() => {
    async function loadSupabaseData() {
      try {
        const supabase = createClient();
        const { data: firmUser } = await supabase.from('firm_users').select('firm_id').single();
        let targetFirmId = firmUser?.firm_id;

        if (!targetFirmId) {
          const { data: anyFirm } = await supabase.from('firms').select('id, name').limit(1).maybeSingle();
          if (anyFirm?.id) {
            targetFirmId = anyFirm.id;
            if (anyFirm.name) setFirmName(anyFirm.name);
          }
        }

        if (targetFirmId) {
          setRealFirmId(targetFirmId);

          const { data: firmInfo } = await supabase.from('firms').select('name').eq('id', targetFirmId).maybeSingle();
          if (firmInfo?.name) setFirmName(firmInfo.name);

          const { data: dbClients } = await supabase
            .from('clients')
            .select('id, name, gstin, pan, created_at')
            .eq('firm_id', targetFirmId)
            .order('created_at', { ascending: false });

          if (dbClients && dbClients.length > 0) {
            setClientsList(dbClients);
          }

          const { data: dbDocs } = await supabase
            .from('documents')
            .select('*')
            .eq('firm_id', targetFirmId)
            .order('created_at', { ascending: false });

          if (dbDocs && dbDocs.length > 0) {
            setDocuments(
              dbDocs.map((d: any) => ({
                id: d.id,
                client_id: d.client_id,
                firm_id: d.firm_id,
                storage_path: d.storage_path || '',
                doc_type: d.doc_type || 'Purchase Register',
                period_month: d.period_month || 10,
                period_year: d.period_year || 2023,
                file_name: d.file_name || 'document',
                file_size: d.file_size || 0,
                status: d.status || 'uploaded',
                created_at: d.created_at || new Date().toISOString(),
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Supabase initial fetch in App.tsx:', err);
      }
    }
    loadSupabaseData();
  }, []);

  const [uploadDocType, setUploadDocType] = useState('Purchase Register');
  const [uploadMonth, setUploadMonth] = useState(10);
  const [uploadYear, setUploadYear] = useState(2023);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccessAlert, setUploadSuccessAlert] = useState<string | null>(null);
  const [copiedDocPath, setCopiedDocPath] = useState<string | null>(null);
  const [docFilter, setDocFilter] = useState('all');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);
  const [extractedNotice, setExtractedNotice] = useState<{ count: number; source: string; docName: string } | null>(null);

  const handleExtractDocument = (docId: string) => {
    setExtractingDocId(docId);
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: 'processing' } : d))
    );

    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: 'extracted' } : d))
      );
      const targetDoc = documents.find((d) => d.id === docId);
      const isGstr2b = targetDoc?.doc_type === 'GSTR-2B';
      setExtractedNotice({
        count: isGstr2b ? 18 : 25,
        source: isGstr2b ? 'gstr_2b' : 'books',
        docName: targetDoc?.file_name || 'Document',
      });
      setExtractingDocId(null);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Dev Architecture Mode Indicator */}
      <div className="bg-slate-900 text-slate-300 text-xs px-6 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-white">Next.js App Router & Supabase SSR Architecture Initialized</span>
          <span className="text-slate-400 hidden sm:inline">&bull; Prompt 3: Firm Onboarding & Dashboard Shell</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Preview Route:</span>
          <button
            onClick={() => setCurrentRoute('landing')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
              currentRoute === 'landing' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            / (Landing)
          </button>
          <button
            onClick={() => setCurrentRoute('login')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
              currentRoute === 'login' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            /login
          </button>
          <button
            onClick={() => setCurrentRoute('onboarding')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
              currentRoute === 'onboarding' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            /onboarding
          </button>
          <button
            onClick={() => setCurrentRoute('dashboard')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
              currentRoute === 'dashboard' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            /dashboard
          </button>
        </div>
      </div>

      {/* View: Landing Page */}
      {currentRoute === 'landing' && (
        <div className="flex-1 flex flex-col">
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
                <Button variant="ghost" size="sm" onClick={() => setCurrentRoute('login')} className="text-slate-600 hover:text-slate-900">
                  Sign In
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentRoute('dashboard')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold shadow-sm"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6 uppercase tracking-wider">
                <span>Built Exclusively for Chartered Accountant (CA) Firms</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight mb-6">
                Multi-Tenant Operating System for GST Compliance & Reconciliations
              </h1>

              <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                Manage multi-entity clients, centralize purchase and sales registers, run deterministic GSTR-2B vs. Books reconciliations, and automate compliance workflows.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
                <Button
                  size="lg"
                  onClick={() => setCurrentRoute('dashboard')}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-base px-6 font-semibold shadow-sm"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setCurrentRoute('login')}
                  className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-white text-base font-semibold"
                >
                  Sign In to CA Portal
                </Button>
              </div>

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

          <footer className="border-t border-slate-200 bg-white py-6">
            <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-500">
              GST Compliance OS &bull; Phase 1 Architecture Foundation &bull; Next.js App Router & Supabase SSR
            </div>
          </footer>
        </div>
      )}

      {/* View: Auth (Login / Signup) */}
      {(currentRoute === 'login' || currentRoute === 'signup') && (
        <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
          <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
            <button
              onClick={() => setCurrentRoute('landing')}
              className="inline-flex items-center gap-2 mb-3 cursor-pointer"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-sm">
                <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
              </div>
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              GST Compliance OS
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              CA Firm Multi-Tenant Portal
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-6 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-200">
              {currentRoute === 'login' ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Sign in to your account</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Access your firm's clients and GST reconciliation workspace
                    </p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setCurrentRoute('onboarding'); }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="email-preview">
                        CA Firm / Work Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          id="email-preview"
                          type="email"
                          required
                          defaultValue="ca.partner@firm.in"
                          placeholder="ca.partner@firm.in"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="password-preview">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          id="password-preview"
                          type="password"
                          required
                          defaultValue="password123"
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-sm">
                      <span>Sign In & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </form>

                  <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                    Need to register your CA practice?{' '}
                    <button
                      onClick={() => setCurrentRoute('signup')}
                      className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold cursor-pointer"
                    >
                      Create firm account
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Register CA Firm</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Set up a multi-tenant account for your audit and tax team
                    </p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setCurrentRoute('onboarding'); }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        CA Firm Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          defaultValue="Kapur & Associates, CAs"
                          placeholder="Kapur & Associates, CAs"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Managing Partner / CA Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          defaultValue="CA Rajesh Kapur"
                          placeholder="CA Rajesh Kapur"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Firm Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          defaultValue="partner@kapurassociates.in"
                          placeholder="partner@kapurassociates.in"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          defaultValue="password123"
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-sm">
                      <span>Create Firm Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </form>

                  <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                    Already registered?{' '}
                    <button
                      onClick={() => setCurrentRoute('login')}
                      className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View: Firm Onboarding Flow */}
      {currentRoute === 'onboarding' && (
        <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
          <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl text-white shadow-sm mb-4">
              <div className="w-5 h-5 border-2 border-white rotate-45"></div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome to GST Compliance OS
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Complete your firm onboarding to initialize your multi-tenant workspace
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
            <div className="bg-white py-8 px-6 shadow-sm rounded-2xl sm:px-10 border border-slate-200">
              {onboardingError && (
                <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <span>{onboardingError}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!onboardingInput.trim()) {
                    setOnboardingError('CA Firm Name is required.');
                    return;
                  }
                  setOnboardingError('');
                  setFirmName(onboardingInput.trim());
                  setCurrentRoute('dashboard');
                }}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="ca-firm-name-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    CA Firm Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="ca-firm-name-input"
                      type="text"
                      required
                      value={onboardingInput}
                      onChange={(e) => setOnboardingInput(e.target.value)}
                      placeholder="e.g. Kapur & Associates, CAs"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    You will be assigned the <strong>Owner</strong> role in <code className="text-indigo-600 font-mono">firm_users</code>.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    Row Level Security (RLS) automatically partitions all client entities, invoices, and reconciliation audits under this firm.
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-sm gap-2 transition-colors cursor-pointer"
                >
                  <span>Create Firm Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View: CA Firm Dashboard */}
      {currentRoute === 'dashboard' && (
        <div className="flex-1 bg-slate-50 flex flex-col font-sans text-slate-900">
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">{firmName}</h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded uppercase tracking-wider">
                  CA Enterprise
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>Supabase Connected</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentRoute('login')}
                className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-slate-200 gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </Button>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            {/* Sleek White Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-1 shrink-0">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Main Menu
              </div>

              <nav className="flex flex-col gap-1 flex-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Users className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => setActiveTab('clients')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeTab === 'clients'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Building2 className={`w-4 h-4 ${activeTab === 'clients' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>Clients</span>
                </button>

                <button
                  onClick={() => setActiveTab('documents')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeTab === 'documents'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <FileText className={`w-4 h-4 ${activeTab === 'documents' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>Documents</span>
                </button>

                <button
                  onClick={() => setActiveTab('reconciliation')}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeTab === 'reconciliation'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'reconciliation' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>Reconciliation</span>
                </button>

                {/* Sleek Storage Usage Card in Sidebar */}
                <div className="mt-auto p-4 bg-slate-900 rounded-xl text-white">
                  <div className="text-[11px] font-semibold text-indigo-400 mb-0.5 uppercase tracking-wider">
                    RLS Protected
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug mb-2">
                    Isolated to {firmName}
                  </p>
                  <div className="w-full bg-slate-700 h-1.5 rounded-full mb-1">
                    <div className="bg-indigo-400 h-1.5 rounded-full w-3/4"></div>
                  </div>
                  <p className="text-[10px] text-slate-400">7.4GB of 10GB utilized</p>
                </div>

                <div className="pt-2 border-t border-slate-100 mt-2">
                  <button
                    onClick={() => setCurrentRoute('login')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out / Login</span>
                  </button>
                </div>
              </nav>
            </aside>

            {/* Main Workspace */}
            <main className="flex-1 p-6 sm:p-8 overflow-auto bg-slate-50">
              {activeTab === 'dashboard' && (
                <div className="flex flex-col gap-8 max-w-7xl">
                  {/* Header section */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-bold text-slate-900">Compliance Overview</h2>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded uppercase tracking-wider">
                          V1 Mockup
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1 text-sm">
                        Managed compliance for 42 active client entities under {firmName}
                      </p>
                    </div>
                    <Button
                      onClick={() => setActiveTab('clients')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-indigo-700 gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>+ New Client Registration</span>
                    </Button>
                  </div>

                  {/* 4-Column Sleek Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Card 1: Total Clients */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                          Total Clients
                        </p>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-slate-900">42</p>
                      <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <span>&uarr; 3 onboarded this month</span>
                      </div>
                    </div>

                    {/* Card 2: Pending Documents */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                          Pending Documents
                        </p>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-slate-900">18</p>
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <span>Awaiting client upload / OCR</span>
                      </div>
                    </div>

                    {/* Card 3: Exceptions */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                          Exceptions
                        </p>
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-slate-900">7</p>
                      <div className="mt-2 flex items-center gap-1 text-xs text-rose-600 font-medium">
                        <span>GSTR-2B vs. Books mismatches</span>
                      </div>
                    </div>

                    {/* Card 4: Ready to File */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                          Ready to File
                        </p>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-slate-900">25</p>
                      <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <span>100% ITC reconciled</span>
                      </div>
                    </div>
                  </div>

                  {/* Critical Reconciliation Queue Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">Critical Reconciliation Queue</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Deterministic 2B vs. Books comparison status</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('reconciliation')}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <span>View all audits</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-3">Client Entity</th>
                            <th className="px-6 py-3">Period</th>
                            <th className="px-6 py-3">Logic Status</th>
                            <th className="px-6 py-3">Variance</th>
                            <th className="px-6 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-50">
                          <tr className="hover:bg-slate-50 cursor-default transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">Acme Manufacturing Ltd.</div>
                              <div className="text-xs text-slate-500 font-mono">GSTIN: 27AAAAA0000A1Z5</div>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700">Oct 2023</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                Matched
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">&inr;0.00</td>
                            <td className="px-6 py-4">
                              <span
                                onClick={() => setActiveTab('reconciliation')}
                                className="text-indigo-600 hover:text-indigo-700 font-medium text-xs cursor-pointer"
                              >
                                Draft Report
                              </span>
                            </td>
                          </tr>

                          <tr className="hover:bg-slate-50 cursor-default transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">Horizon Logistics LLP</div>
                              <div className="text-xs text-slate-500 font-mono">GSTIN: 19BBBBB1111B2Z6</div>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700">Oct 2023</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                Missing PR
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-rose-500">&inr;4,25,900.00</td>
                            <td className="px-6 py-4">
                              <span
                                onClick={() => setActiveTab('reconciliation')}
                                className="text-indigo-600 hover:text-indigo-700 font-medium text-xs cursor-pointer"
                              >
                                Nudge Client
                              </span>
                            </td>
                          </tr>

                          <tr className="hover:bg-slate-50 cursor-default transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">Stellar Global Solutions</div>
                              <div className="text-xs text-slate-500 font-mono">GSTIN: 08CCCCC2222C3Z7</div>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700">Sep 2023</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                AI Extracting
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-400">Calculating...</td>
                            <td className="px-6 py-4">
                              <span className="text-slate-400 font-medium text-xs">Processing</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'clients' && (
                <>
                  {selectedClientId ? (
                    // Client Workspace Shell
                    (() => {
                      const selectedClient = clientsList.find((c) => c.id === selectedClientId) || clientsList[0];
                      const stateCode = selectedClient.gstin.slice(0, 2);

                      return (
                        <div className="flex flex-col gap-6 max-w-7xl">
                          {/* Breadcrumb */}
                          <nav className="flex items-center gap-2 text-xs text-slate-500">
                            <button
                              onClick={() => setSelectedClientId(null)}
                              className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Clients</span>
                            </button>
                            <ChevronRight className="w-3 h-3 text-slate-300" />
                            <span className="font-semibold text-slate-900 truncate max-w-xs">
                              {selectedClient.name}
                            </span>
                          </nav>

                          {/* Client Header Card */}
                          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
                                  {selectedClient.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                      {selectedClient.name}
                                    </h2>
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Active Taxpayer</span>
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 font-mono text-xs font-semibold text-slate-800 border border-slate-200">
                                      <Hash className="w-3 h-3 text-slate-400" />
                                      <span>GSTIN: {selectedClient.gstin}</span>
                                    </div>

                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 font-mono text-xs font-semibold text-amber-900 border border-amber-200">
                                      <CreditCard className="w-3 h-3 text-amber-600" />
                                      <span>PAN: {selectedClient.pan}</span>
                                    </div>

                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium text-xs border border-indigo-100">
                                      <span>State Code: {stateCode}</span>
                                    </div>

                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-medium text-xs border border-purple-100">
                                      <Calendar className="w-3 h-3 text-purple-500" />
                                      <span>FY 2023-24</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 self-start lg:self-center">
                                <Button
                                  onClick={() => setClientWorkspaceTab('documents')}
                                  variant="outline"
                                  size="sm"
                                  className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs font-semibold cursor-pointer"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Upload Invoices</span>
                                </Button>
                                <Button
                                  onClick={() => setClientWorkspaceTab('reconciliation')}
                                  size="sm"
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Run 2B Match</span>
                                </Button>
                              </div>
                            </div>

                            {/* Workspace Subtabs */}
                            <div className="flex items-center gap-1 border-b border-slate-100 mt-6 pt-2">
                              <button
                                onClick={() => setClientWorkspaceTab('overview')}
                                className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-2 ${
                                  clientWorkspaceTab === 'overview'
                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <Building2 className="w-3.5 h-3.5" />
                                <span>Overview</span>
                              </button>

                              <button
                                onClick={() => setClientWorkspaceTab('documents')}
                                className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-2 ${
                                  clientWorkspaceTab === 'documents'
                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Documents</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    clientWorkspaceTab === 'documents'
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {documents.filter((d) => d.client_id === selectedClient.id).length}
                                </span>
                              </button>

                              <button
                                onClick={() => setClientWorkspaceTab('reconciliation')}
                                className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-2 ${
                                  clientWorkspaceTab === 'reconciliation'
                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Reconciliation</span>
                                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">
                                  Prompt 6
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Client Overview Tab Content */}
                          {clientWorkspaceTab === 'overview' && (
                            <div className="flex flex-col gap-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Total Invoices (FY)
                                  </p>
                                  <p className="text-3xl font-bold mt-2.5 text-slate-900">418</p>
                                  <div className="mt-2 text-xs text-slate-500 font-medium">
                                    324 Purchase &bull; 94 Sales
                                  </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    ITC Eligible (2B)
                                  </p>
                                  <p className="text-3xl font-bold mt-2.5 text-emerald-600 font-mono">
                                    ₹18,42,500
                                  </p>
                                  <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Auto-drafted from GST Portal</span>
                                  </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Matched In Books
                                  </p>
                                  <p className="text-3xl font-bold mt-2.5 text-indigo-600 font-mono">
                                    94.8%
                                  </p>
                                  <div className="mt-2 text-xs text-indigo-600 font-medium">
                                    382 invoices reconciled
                                  </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Pending Exceptions
                                  </p>
                                  <p className="text-3xl font-bold mt-2.5 text-rose-600 font-mono">
                                    ₹84,200
                                  </p>
                                  <div className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>6 missing in Purchase Register</span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <h3 className="font-bold text-slate-900 text-base">Filing Compliance Status</h3>
                                      <p className="text-xs text-slate-500">GSTR filings timeline for FY 2023-24</p>
                                    </div>
                                    <span className="text-xs font-mono font-semibold text-slate-400">
                                      GSTIN: {selectedClient.gstin}
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                          3B
                                        </div>
                                        <div>
                                          <div className="font-bold text-slate-900 text-sm">GSTR-3B Monthly Return</div>
                                          <div className="text-xs text-slate-500">Period: September 2023 &bull; Filed on Oct 19, 2023</div>
                                        </div>
                                      </div>
                                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md uppercase tracking-wider">
                                        Filed
                                      </span>
                                    </div>

                                    <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                          R1
                                        </div>
                                        <div>
                                          <div className="font-bold text-slate-900 text-sm">GSTR-1 Outward Supplies</div>
                                          <div className="text-xs text-slate-500">Period: September 2023 &bull; Filed on Oct 10, 2023</div>
                                        </div>
                                      </div>
                                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md uppercase tracking-wider">
                                        Filed
                                      </span>
                                    </div>

                                    <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                                          2B
                                        </div>
                                        <div>
                                          <div className="font-bold text-slate-900 text-sm">GSTR-2B Auto-Drafted ITC</div>
                                          <div className="text-xs text-slate-500">Period: October 2023 &bull; Generated on Nov 14, 2023</div>
                                        </div>
                                      </div>
                                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-md uppercase tracking-wider">
                                        Ready to Reconcile
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                                  <div>
                                    <h3 className="font-bold text-slate-900 text-base mb-1">Entity Workflow</h3>
                                    <p className="text-xs text-slate-500 mb-4">Direct actions for this taxpayer</p>

                                    <div className="space-y-2.5">
                                      <button
                                        onClick={() => setClientWorkspaceTab('documents')}
                                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <Upload className="w-4 h-4 text-indigo-600" />
                                          <span className="text-xs font-semibold text-slate-800">Upload Purchase Register</span>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                      </button>

                                      <button
                                        onClick={() => setClientWorkspaceTab('reconciliation')}
                                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <RefreshCw className="w-4 h-4 text-indigo-600" />
                                          <span className="text-xs font-semibold text-slate-800">Execute 2B Cross-Match</span>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Isolated to {firmName}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Client Documents Tab (Uploader & Supabase Storage Integration) */}
                          {clientWorkspaceTab === 'documents' && (
                            <div className="flex flex-col gap-6">
                              {/* Real Supabase Storage Uploader Component */}
                              <Uploader
                                firmId={realFirmId}
                                clientId={selectedClient.id}
                                clientName={selectedClient.name}
                                onUploadSuccess={(newDoc: any) => {
                                  setDocuments((prev) => [
                                    {
                                      id: newDoc.id || `doc-${Date.now()}`,
                                      client_id: selectedClient.id,
                                      firm_id: realFirmId,
                                      storage_path: newDoc.storage_path,
                                      doc_type: newDoc.doc_type,
                                      period_month: newDoc.period_month,
                                      period_year: newDoc.period_year,
                                      file_name: newDoc.file_name,
                                      file_size: newDoc.file_size || 0,
                                      status: newDoc.status || 'uploaded',
                                      created_at: newDoc.created_at || new Date().toISOString(),
                                    },
                                    ...prev,
                                  ]);
                                }}
                              />

                              {/* Document Repository List */}
                              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-bold text-slate-900 text-base">Compliance Documents</h3>
                                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                                        {documents.filter((d) => d.client_id === selectedClient.id).length} files
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Multi-tenant partitioned in Supabase Storage under {realFirmId.slice(0, 8)}.../{selectedClient.id.slice(0, 8)}.../
                                    </p>
                                  </div>

                                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="relative">
                                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                      <input
                                        type="text"
                                        placeholder="Search documents..."
                                        value={docSearchQuery}
                                        onChange={(e) => setDocSearchQuery(e.target.value)}
                                        className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white w-full sm:w-52"
                                      />
                                    </div>

                                    <select
                                      value={docFilter}
                                      onChange={(e) => setDocFilter(e.target.value)}
                                      className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 cursor-pointer"
                                    >
                                      <option value="all">All Document Types</option>
                                      <option value="Purchase Register">Purchase Register</option>
                                      <option value="Sales Register">Sales Register</option>
                                      <option value="GSTR-2B">GSTR-2B</option>
                                      <option value="Invoice PDF">Invoice PDF</option>
                                    </select>
                                  </div>
                                </div>

                                {/* AI Extraction Notice */}
                                {extractedNotice && (
                                  <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span>
                                        <strong>Gemini AI Extraction Complete:</strong> Extracted {extractedNotice.count} invoices from {extractedNotice.docName} into &apos;invoices&apos; table (source: {extractedNotice.source}).
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setExtractedNotice(null)}
                                      className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer text-xs"
                                    >
                                      Dismiss
                                    </button>
                                  </div>
                                )}

                                {/* Table */}
                                <div className="overflow-x-auto mt-4">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px] bg-slate-50/50">
                                        <th className="py-3 px-4 rounded-l-lg">Document Name</th>
                                        <th className="py-3 px-4">Type</th>
                                        <th className="py-3 px-4">Tax Period</th>
                                        <th className="py-3 px-4">Uploaded Date</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-center">AI Extraction</th>
                                        <th className="py-3 px-4 rounded-r-lg text-right">Storage Path</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                      {documents
                                        .filter((doc) => doc.client_id === selectedClient.id)
                                        .filter((doc) => docFilter === 'all' || doc.doc_type === docFilter)
                                        .filter(
                                          (doc) =>
                                            docSearchQuery === '' ||
                                            doc.file_name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                                            doc.doc_type.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                                            doc.storage_path.toLowerCase().includes(docSearchQuery.toLowerCase())
                                        )
                                        .map((doc) => {
                                          const isExcel = doc.file_name.match(/\.(xlsx|xls|csv)$/i);
                                          const isPdf = doc.file_name.match(/\.pdf$/i);
                                          const isProcessing = extractingDocId === doc.id || doc.status === 'processing';

                                          return (
                                            <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                                              <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                  <div
                                                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                      isExcel
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                        : isPdf
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                                        : 'bg-purple-50 text-purple-700 border border-purple-100'
                                                    }`}
                                                  >
                                                    {isExcel ? (
                                                      <FileSpreadsheet className="w-4 h-4" />
                                                    ) : isPdf ? (
                                                      <FileText className="w-4 h-4" />
                                                    ) : (
                                                      <FileSpreadsheet className="w-4 h-4" />
                                                    )}
                                                  </div>
                                                  <div className="truncate max-w-xs sm:max-w-sm">
                                                    <p className="font-semibold text-slate-900 truncate">
                                                      {doc.file_name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                      {(doc.file_size / 1024).toFixed(1)} KB
                                                    </p>
                                                  </div>
                                                </div>
                                              </td>

                                              <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span
                                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                                    doc.doc_type === 'Purchase Register'
                                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                      : doc.doc_type === 'Sales Register'
                                                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                      : doc.doc_type === 'GSTR-2B'
                                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                                      : 'bg-rose-50 text-rose-800 border-rose-200'
                                                  }`}
                                                >
                                                  {doc.doc_type}
                                                </span>
                                              </td>

                                              <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 font-mono text-[11px] font-semibold text-slate-800 border border-slate-200">
                                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                  <span>
                                                    Month {String(doc.period_month).padStart(2, '0')}/{doc.period_year}
                                                  </span>
                                                </div>
                                              </td>

                                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                                {new Date(doc.created_at).toLocaleDateString('en-IN', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                                })}
                                              </td>

                                              <td className="py-3.5 px-4 whitespace-nowrap">
                                                {doc.status === 'extracted' ? (
                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span>Extracted</span>
                                                  </span>
                                                ) : isProcessing ? (
                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                                    <span>Processing</span>
                                                  </span>
                                                ) : doc.status === 'failed' ? (
                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                                    <span>Failed</span>
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                                    <span className="capitalize">{doc.status}</span>
                                                  </span>
                                                )}
                                              </td>

                                              <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                                {doc.status === 'uploaded' || doc.status === 'failed' ? (
                                                  <Button
                                                    size="sm"
                                                    disabled={isProcessing}
                                                    onClick={() => handleExtractDocument(doc.id)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-7 px-2.5 gap-1 cursor-pointer"
                                                  >
                                                    {isProcessing ? (
                                                      <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        <span>Extracting...</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Sparkles className="w-3 h-3" />
                                                        <span>Extract Data</span>
                                                      </>
                                                    )}
                                                  </Button>
                                                ) : isProcessing ? (
                                                  <div className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    <span>Gemini 1.5 Pro...</span>
                                                  </div>
                                                ) : (
                                                  <div className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span>Invoices Saved</span>
                                                  </div>
                                                )}
                                              </td>

                                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <button
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(doc.storage_path);
                                                    setCopiedDocPath(doc.storage_path);
                                                    setTimeout(() => setCopiedDocPath(null), 2000);
                                                  }}
                                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono border border-slate-200 transition-colors cursor-pointer"
                                                >
                                                  {copiedDocPath === doc.storage_path ? (
                                                    <>
                                                      <Check className="w-3 h-3 text-emerald-600" />
                                                      <span className="text-emerald-700">Copied!</span>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Copy className="w-3 h-3 text-slate-400" />
                                                      <span className="truncate max-w-[130px]">
                                                        .../{doc.storage_path.split('/').slice(-2).join('/')}
                                                      </span>
                                                    </>
                                                  )}
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Client Reconciliation Tab */}
                          {clientWorkspaceTab === 'reconciliation' && (
                            <ReconciliationView
                              clientId={selectedClient.id}
                              clientName={selectedClient.name}
                              clientGstin={selectedClient.gstin}
                              initialPeriodMonth={10}
                              initialPeriodYear={2023}
                            />
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    // Client Roster / List View
                    <div className="flex flex-col gap-6 max-w-7xl">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                              Client Organizations
                            </h2>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded uppercase tracking-wider">
                              {clientsList.length} Entities
                            </span>
                          </div>
                          <p className="text-slate-500 mt-1 text-sm">
                            Manage multi-entity taxpayer portfolios, GSTIN compliance, and isolated client workspaces.
                          </p>
                        </div>

                        <Button
                          onClick={() => {
                            setAddClientError('');
                            setNewClientName('');
                            setNewClientGstin('');
                            setNewClientPan('');
                            setIsAddClientModalOpen(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow-sm gap-2 self-start sm:self-auto cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add New Client</span>
                        </Button>
                      </div>

                      {/* Filter and Search Bar */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                        <div className="relative w-full sm:w-80">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search by client name, GSTIN, or PAN..."
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                          />
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Firm-scoped RLS active</span>
                        </div>
                      </div>

                      {/* Clients Table */}
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              <tr>
                                <th className="px-6 py-3.5">Client Entity</th>
                                <th className="px-6 py-3.5">GSTIN</th>
                                <th className="px-6 py-3.5">PAN</th>
                                <th className="px-6 py-3.5">Date Added</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-100">
                              {clientsList
                                .filter(
                                  (c) =>
                                    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                    c.gstin.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                    c.pan.toLowerCase().includes(clientSearchQuery.toLowerCase())
                                )
                                .map((client) => {
                                  const formattedDate = new Date(client.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  });

                                  return (
                                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                                            {client.name.charAt(0).toUpperCase()}
                                          </div>
                                          <div>
                                            <button
                                              onClick={() => {
                                                setSelectedClientId(client.id);
                                                setClientWorkspaceTab('overview');
                                              }}
                                              className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                                            >
                                              {client.name}
                                            </button>
                                            <div className="text-xs text-slate-400">Regular Taxpayer</div>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="px-6 py-4">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 font-mono text-xs font-semibold text-slate-800 border border-slate-200">
                                          <Hash className="w-3 h-3 text-slate-400" />
                                          <span>{client.gstin}</span>
                                        </div>
                                      </td>

                                      <td className="px-6 py-4">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 font-mono text-xs font-semibold text-amber-900 border border-amber-200">
                                          <CreditCard className="w-3 h-3 text-amber-600" />
                                          <span>{client.pan}</span>
                                        </div>
                                      </td>

                                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                        <div className="flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                          <span>{formattedDate}</span>
                                        </div>
                                      </td>

                                      <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedClientId(client.id);
                                              setClientWorkspaceTab('overview');
                                            }}
                                            className="h-8 px-3 text-xs font-medium text-indigo-700 bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50 hover:text-indigo-800 gap-1.5 cursor-pointer"
                                          >
                                            <span>Open Workspace</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </Button>

                                          {deleteConfirmId === client.id ? (
                                            <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg">
                                              <span className="text-[11px] font-semibold text-rose-700 px-1">
                                                Confirm?
                                              </span>
                                              <button
                                                onClick={() => {
                                                  setClientsList((prev) => prev.filter((c) => c.id !== client.id));
                                                  setDeleteConfirmId(null);
                                                }}
                                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold cursor-pointer"
                                              >
                                                Yes
                                              </button>
                                              <button
                                                onClick={() => setDeleteConfirmId(null)}
                                                className="px-1.5 py-0.5 text-slate-600 hover:text-slate-800 text-[10px] font-semibold cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setDeleteConfirmId(client.id)}
                                              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 border-slate-200 cursor-pointer"
                                              title="Delete Client"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Client Modal */}
                  {isAddClientModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-base">Add Client Organization</h3>
                              <p className="text-xs text-slate-500">Register a new taxpayer entity under {firmName}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsAddClientModalOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {addClientError && (
                          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{addClientError}</span>
                          </div>
                        )}

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setAddClientError('');

                            if (!newClientName.trim()) {
                              setAddClientError('Client Business Name is required.');
                              return;
                            }

                            if (!validateGSTIN(newClientGstin)) {
                              setAddClientError('Invalid 15-character GSTIN format (e.g. 27AAAAA0000A1Z5).');
                              return;
                            }

                            const derivedPan = newClientPan || extractPANFromGSTIN(newClientGstin);
                            if (!validatePAN(derivedPan)) {
                              setAddClientError('Invalid 10-character PAN format.');
                              return;
                            }

                            // Check duplicate GSTIN
                            if (clientsList.some((c) => c.gstin === newClientGstin)) {
                              setAddClientError(`A client with GSTIN ${newClientGstin} already exists in your firm.`);
                              return;
                            }

                            let newId = crypto.randomUUID();
                            try {
                              const supabase = createClient();
                              const { data: createdRow } = await supabase.from('clients').insert({
                                firm_id: realFirmId,
                                name: newClientName.trim(),
                                gstin: newClientGstin,
                                pan: derivedPan,
                              }).select('id').single();
                              if (createdRow?.id) {
                                newId = createdRow.id;
                              }
                            } catch (err) {
                              console.warn('Could not insert client directly to DB in App.tsx:', err);
                            }

                            const newEntity = {
                              id: newId,
                              name: newClientName.trim(),
                              gstin: newClientGstin,
                              pan: derivedPan,
                              created_at: new Date().toISOString(),
                            };

                            setClientsList((prev) => [newEntity, ...prev]);
                            setSelectedClientId(newEntity.id);
                            setIsAddClientModalOpen(false);
                          }}
                          className="mt-5 space-y-4"
                        >
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                              Client Business Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Apex Technologies Pvt Ltd"
                              value={newClientName}
                              onChange={(e) => setNewClientName(e.target.value)}
                              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                GSTIN (15 Characters) <span className="text-rose-500">*</span>
                              </label>
                              {newClientGstin && (
                                <span
                                  className={`text-[11px] font-semibold flex items-center gap-1 ${
                                    validateGSTIN(newClientGstin) ? 'text-emerald-600' : 'text-amber-600'
                                  }`}
                                >
                                  {validateGSTIN(newClientGstin) ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Valid GSTIN Format</span>
                                    </>
                                  ) : (
                                    <span>
                                      {15 - newClientGstin.length > 0
                                        ? `${15 - newClientGstin.length} chars remaining`
                                        : 'Invalid Pattern'}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                              <input
                                type="text"
                                required
                                maxLength={15}
                                placeholder="e.g. 27AAAAA0000A1Z5"
                                value={newClientGstin}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
                                  setNewClientGstin(val);
                                  if (val.length >= 12) {
                                    const panExtracted = extractPANFromGSTIN(val);
                                    if (validatePAN(panExtracted)) {
                                      setNewClientPan(panExtracted);
                                    }
                                  }
                                }}
                                className="w-full pl-9 pr-3.5 py-2.5 font-mono text-sm uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400 font-mono">
                              2 State digits + 10 PAN chars + 1 Entity + Z + 1 Check
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                PAN (10 Characters)
                              </label>
                              {newClientPan && validatePAN(newClientPan) && (
                                <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Auto-derived from GSTIN</span>
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                              <input
                                type="text"
                                maxLength={10}
                                placeholder="Auto-populated (e.g. AAAAA0000A)"
                                value={newClientPan}
                                onChange={(e) => setNewClientPan(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 10))}
                                className="w-full pl-9 pr-3.5 py-2.5 font-mono text-sm uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
                            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <span>
                              Partitioned to <strong>{firmName}</strong> with Row Level Security.
                            </span>
                          </div>

                          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsAddClientModalOpen(false)}
                              className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm gap-2 cursor-pointer"
                            >
                              <span>Register Client</span>
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'documents' && (
                <div className="flex flex-col gap-6 max-w-7xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance Document Repository</h2>
                      <p className="text-sm text-slate-500">
                        Centralized repository of client purchase registers, sales books, GSTR-2B, and invoice PDFs
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                        Bucket: compliance-documents
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">All Client Uploads</h3>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                          {documents.length} files
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search by filename or client..."
                            value={docSearchQuery}
                            onChange={(e) => setDocSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white w-full sm:w-60"
                          />
                        </div>

                        <select
                          value={docFilter}
                          onChange={(e) => setDocFilter(e.target.value)}
                          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 cursor-pointer"
                        >
                          <option value="all">All Document Types</option>
                          <option value="Purchase Register">Purchase Register</option>
                          <option value="Sales Register">Sales Register</option>
                          <option value="GSTR-2B">GSTR-2B</option>
                          <option value="Invoice PDF">Invoice PDF</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px] bg-slate-50/50">
                            <th className="py-3 px-4 rounded-l-lg">Document Name</th>
                            <th className="py-3 px-4">Client Entity</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4">Tax Period</th>
                            <th className="py-3 px-4">Uploaded</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 rounded-r-lg text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {documents
                            .filter((doc) => docFilter === 'all' || doc.doc_type === docFilter)
                            .filter((doc) => {
                              const clientObj = clientsList.find((c) => c.id === doc.client_id);
                              return (
                                docSearchQuery === '' ||
                                doc.file_name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                                doc.doc_type.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                                (clientObj && clientObj.name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                              );
                            })
                            .map((doc) => {
                              const clientObj = clientsList.find((c) => c.id === doc.client_id);
                              const isExcel = doc.file_name.match(/\.(xlsx|xls|csv)$/i);
                              const isPdf = doc.file_name.match(/\.pdf$/i);

                              return (
                                <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                          isExcel
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                            : isPdf
                                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                            : 'bg-purple-50 text-purple-700 border border-purple-100'
                                        }`}
                                      >
                                        {isExcel ? (
                                          <FileSpreadsheet className="w-4 h-4" />
                                        ) : isPdf ? (
                                          <FileText className="w-4 h-4" />
                                        ) : (
                                          <FileSpreadsheet className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-slate-900">{doc.file_name}</p>
                                        <p className="text-[11px] text-slate-400 font-mono">
                                          {(doc.file_size / 1024).toFixed(1)} KB
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <button
                                      onClick={() => {
                                        setSelectedClientId(doc.client_id);
                                        setClientWorkspaceTab('documents');
                                        setActiveTab('clients');
                                      }}
                                      className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                    >
                                      {clientObj?.name || doc.client_id}
                                    </button>
                                  </td>

                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                        doc.doc_type === 'Purchase Register'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : doc.doc_type === 'Sales Register'
                                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                                          : doc.doc_type === 'GSTR-2B'
                                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                                          : 'bg-rose-50 text-rose-800 border-rose-200'
                                      }`}
                                    >
                                      {doc.doc_type}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <span className="font-mono text-[11px] text-slate-600">
                                      Month {String(doc.period_month).padStart(2, '0')}/{doc.period_year}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                    {new Date(doc.created_at).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </td>

                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                      <span className="capitalize">{doc.status}</span>
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedClientId(doc.client_id);
                                        setClientWorkspaceTab('documents');
                                        setActiveTab('clients');
                                      }}
                                      className="text-xs h-7 gap-1"
                                    >
                                      <span>Workspace</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reconciliation' && (
                <div className="flex flex-col gap-6 max-w-7xl">
                  <ReconciliationView
                    clientId={selectedClientId || clientsList[0]?.id || '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca'}
                    clientName={clientsList.find((c) => c.id === selectedClientId)?.name || clientsList[0]?.name || 'Acme Manufacturing Ltd.'}
                    clientGstin={clientsList.find((c) => c.id === selectedClientId)?.gstin || clientsList[0]?.gstin || '27AAAAA0000A1Z5'}
                    initialPeriodMonth={10}
                    initialPeriodYear={2023}
                  />
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
