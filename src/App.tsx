import React, { useState, useEffect } from 'react';
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
  FileCheck,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateGSTIN, extractPANFromGSTIN, validatePAN } from '@/lib/validations/gst';
import { ReconciliationView } from '@/components/reconciliation/ReconciliationView';
import { Uploader } from '@/components/documents/Uploader';
import { createClient, createBrowserClient } from '@/utils/supabase/client';
import { ClientProvider, useClient } from '@/context/ClientContext';
import { ClientSwitcher } from '@/components/ClientSwitcher';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export const financialYears = [
  'FY 2026-27', // <--- Add the current financial year here
  'FY 2025-26',
  'FY 2024-25',
  'FY 2023-24',
  'FY 2022-23',
];

export default function App() {
  return (
    <ClientProvider>
      <AppInternal />
    </ClientProvider>
  );
}

function AppInternal() {
  const {
    clients,
    loading: clientsLoading,
    refreshClients,
    selectedClientId,
    setSelectedClientId,
    selectedClient,
    currentClient,
    setCurrentClient,
    firmName: contextFirmName,
    setFirmName: setContextFirmName,
    selectedFirmId,
  } = useClient();

  const activeClient =
    selectedClient ||
    currentClient ||
    (selectedClientId ? clients.find((c) => c.id === selectedClientId) : null) ||
    null;

  const [currentRoute, setCurrentRoute] = useState<'landing' | 'login' | 'signup' | 'onboarding' | 'dashboard'>('landing');
  const [activeFY, setActiveFY] = useState(financialYears[0]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'documents' | 'reconciliation'>('dashboard');
  const [firmName, setFirmName] = useState(contextFirmName || 'Kapur & Associates, CAs');
  const [onboardingInput, setOnboardingInput] = useState('');
  const [onboardingError, setOnboardingError] = useState('');

  // Active DB firm ID
  const [realFirmId, setRealFirmId] = useState<string>('');

  // Real Auth Form States
  const [loginEmail, setLoginEmail] = useState('ca.partner@firm.in');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupFirmName, setSignupFirmName] = useState('Kapur & Associates, CAs');
  const [signupFullName, setSignupFullName] = useState('CA Rajesh Kapur');
  const [signupEmail, setSignupEmail] = useState('partner@kapurassociates.in');
  const [signupPassword, setSignupPassword] = useState('password123');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        setLoginError(error.message);
        setLoginLoading(false);
        return;
      }

      if (data?.user?.id) {
        setCurrentUser(data.user);
        const { data: fu } = await supabase
          .from('firm_users')
          .select('firm_id')
          .eq('user_id', data.user.id)
          .limit(1)
          .maybeSingle();

        if (fu?.firm_id) {
          setRealFirmId(fu.firm_id);
          setCurrentRoute('dashboard');
        } else {
          setCurrentRoute('onboarding');
        }
      } else {
        setCurrentRoute('dashboard');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRealSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          data: {
            full_name: signupFullName.trim(),
            firm_name: signupFirmName.trim(),
          },
        },
      });

      if (error) {
        setSignupError(error.message);
        setSignupLoading(false);
        return;
      }

      // Let the database trigger (handle_new_user) auto-provision the firm and firm_users record!
      if (data?.user) {
        setCurrentUser(data.user);
      }
      
      setCurrentRoute('dashboard');
    } catch (err: any) {
      setSignupError(err?.message || 'Registration failed.');
    } finally {
      setSignupLoading(false);
    }
  };

  // selectedClientId managed via useClient()
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
    client_name?: string;
    client_trade_name?: string;
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

  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [exceptionsCount, setExceptionsCount] = useState<number>(0);
  const [reconciledCount, setReconciledCount] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load real firm_id, clients, documents, and invoice stats from Supabase with relational join
  React.useEffect(() => {
    let isMounted = true;

    async function loadSupabaseData() {
      try {
        const supabase = createClient();

        // Check active session / user safely using getSession() first to avoid 403 storms
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          if (isMounted) {
            setCurrentUser(null);
            setRealFirmId('');
          }
          return;
        }

        const user = session.user;
        if (isMounted && user) {
          setCurrentUser((prev: any) => (prev?.id === user.id ? prev : user));
        }

        let targetFirmId = selectedFirmId;

        if (!targetFirmId && user?.id) {
          const { data: firmUser } = await supabase
            .from('firm_users')
            .select('firm_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          targetFirmId = firmUser?.firm_id;
        }

        if (!targetFirmId) {
          const { data: anyFirm } = await supabase.from('firms').select('id, name').limit(1).maybeSingle();
          if (anyFirm?.id) {
            targetFirmId = anyFirm.id;
            if (anyFirm.name && isMounted) {
              setFirmName(anyFirm.name);
            }
          }
        }

        if (targetFirmId && isMounted) {
          setRealFirmId(targetFirmId);

          const { data: firmInfo } = await supabase.from('firms').select('name').eq('id', targetFirmId).maybeSingle();
          if (firmInfo?.name && isMounted) {
            setFirmName(firmInfo.name);
          }
        }

        // Fetch documents safely scoped to current user session
        const { data: dbDocs } = await supabase
          .from('documents')
          .select('*, clients(name, trade_name)')
          .order('created_at', { ascending: false });

        if (isMounted) {
          if (dbDocs && dbDocs.length > 0) {
            setDocuments(
              dbDocs.map((d: any) => {
                const clientJoin = Array.isArray(d.clients) ? d.clients[0] : d.clients;
                return {
                  id: d.id,
                  client_id: d.client_id,
                  client_name: clientJoin?.name || clientJoin?.trade_name || '',
                  client_trade_name: clientJoin?.trade_name || '',
                  firm_id: d.firm_id,
                  storage_path: d.storage_path || '',
                  doc_type: d.doc_type || 'Purchase Register',
                  period_month: d.period_month || 10,
                  period_year: d.period_year || 2023,
                  file_name: d.file_name || (d.storage_path ? d.storage_path.split('/').pop() : 'document'),
                  file_size: d.file_size || 0,
                  status: d.status || 'uploaded',
                  created_at: d.created_at || new Date().toISOString(),
                };
              })
            );
          } else {
            setDocuments([]);
          }
        }

        // Fetch live invoice exception counts
        const { count: eCount } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .in('match_status', ['MISMATCH', 'MISSING_IN_BOOKS', 'MISSING_IN_2B']);
        if (isMounted) {
          setExceptionsCount(eCount || 0);
        }

        // Fetch live reconciled/matched counts
        const { count: mCount } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('match_status', 'MATCHED');
        if (isMounted) {
          setReconciledCount(mCount || 0);
        }
      } catch (err) {
        console.warn('Supabase initial fetch in App.tsx:', err);
      }
    }

    loadSupabaseData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Real client overview metrics for selected active client (defaults to 0 for a new client)
  const activeClientId = activeClient?.id || selectedClientId || '';
  const [activeClientMetrics, setActiveClientMetrics] = useState({
    totalInvoices: 0,
    purchaseCount: 0,
    salesCount: 0,
    itcEligible: 0,
    matchedCount: 0,
    matchedPercentage: 0,
    pendingExceptionsCount: 0,
    pendingExceptionsAmount: 0,
    isLoading: false,
  });

  useEffect(() => {
    if (!activeClientId) {
      setActiveClientMetrics({
        totalInvoices: 0,
        purchaseCount: 0,
        salesCount: 0,
        itcEligible: 0,
        matchedCount: 0,
        matchedPercentage: 0,
        pendingExceptionsCount: 0,
        pendingExceptionsAmount: 0,
        isLoading: false,
      });
      return;
    }

    let isMounted = true;
    async function fetchClientMetrics() {
      setActiveClientMetrics((prev) => ({ ...prev, isLoading: true }));
      try {
        const supabase = createClient();

        // Fetch the real count of invoices for this specific client
        const { count: realInvoiceCount } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', activeClientId);

        const { data: invoices, error } = await supabase
          .from('invoices')
          .select('id, source, taxable_value, cgst, sgst, igst, total_amount, recon_status, status, match_status')
          .eq('client_id', activeClientId);

        if ((realInvoiceCount === 0 || realInvoiceCount === null) && (!invoices || invoices.length === 0)) {
          if (isMounted) {
            setActiveClientMetrics({
              totalInvoices: realInvoiceCount ?? 0,
              purchaseCount: 0,
              salesCount: 0,
              itcEligible: 0,
              matchedCount: 0,
              matchedPercentage: 0,
              pendingExceptionsCount: 0,
              pendingExceptionsAmount: 0,
              isLoading: false,
            });
          }
          return;
        }

        let total = realInvoiceCount ?? (invoices?.length || 0);
        let purchase = 0;
        let sales = 0;
        let itc = 0;
        let matched = 0;
        let exceptionsCount = 0;
        let exceptionsAmount = 0;

        for (const inv of invoices) {
          const src = (inv.source || '').toLowerCase();
          const recon = (inv.recon_status || inv.status || inv.match_status || '').toLowerCase();

          if (src.includes('sale') || src === 'sales') {
            sales++;
          } else {
            purchase++;
          }

          const invTax = Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0);
          if (src === 'gstr_2b' || src === '2b' || src === 'books' || src.includes('purchase')) {
            itc += invTax;
          }

          if (recon === 'matched' || recon === 'reconciled' || recon === 'exact_match') {
            matched++;
          } else if (
            recon === 'unmatched' ||
            recon === 'mismatch' ||
            recon.includes('missing') ||
            recon.includes('mismatch')
          ) {
            exceptionsCount++;
            exceptionsAmount += invTax > 0 ? invTax : Number(inv.total_amount || 0);
          }
        }

        const matchPct = total > 0 ? Number(((matched / total) * 100).toFixed(1)) : 0;

        if (isMounted) {
          setActiveClientMetrics({
            totalInvoices: total,
            purchaseCount: purchase,
            salesCount: sales,
            itcEligible: itc,
            matchedCount: matched,
            matchedPercentage: matchPct,
            pendingExceptionsCount: exceptionsCount,
            pendingExceptionsAmount: exceptionsAmount,
            isLoading: false,
          });
        }
      } catch (e) {
        if (isMounted) {
          setActiveClientMetrics((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }

    fetchClientMetrics();
    return () => {
      isMounted = false;
    };
  }, [activeClientId]);

  // Real statutory compliance records pulled from Supabase using @supabase/ssr
  const [clientComplianceRecords, setClientComplianceRecords] = useState<Array<{
    id: string;
    type: string;
    title: string;
    period: string;
    status: string;
    dateOfFiling?: string | null;
    dueDate?: string | null;
    arn?: string | null;
  }>>([]);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState<boolean>(false);

  useEffect(() => {
    if (!activeClientId) {
      setClientComplianceRecords([]);
      setIsLoadingCompliance(false);
      return;
    }

    let isMounted = true;
    async function fetchCompliance() {
      setIsLoadingCompliance(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('statutory_filings')
          .select('*')
          .eq('client_id', activeClientId)
          .order('due_date', { ascending: false });

        if (error) {
          console.warn('Notice querying statutory_filings in App.tsx:', error.message);
          if (isMounted) {
            setClientComplianceRecords([]);
            setIsLoadingCompliance(false);
          }
          return;
        }

        if (!data || data.length === 0) {
          if (isMounted) {
            setClientComplianceRecords([]);
          }
        } else {
          const formatted = data.map((row: any) => {
            const rawType = (row.return_type || row.type || 'GSTR').toString().toUpperCase();
            let badgeLabel = 'GST';
            let title = `${rawType.replace('_', '-')} Return`;

            if (rawType.includes('3B')) {
              badgeLabel = '3B';
              title = 'GSTR-3B Monthly Return';
            } else if (rawType.includes('1') || rawType === 'GSTR_1' || rawType === 'R1') {
              badgeLabel = 'R1';
              title = 'GSTR-1 Outward Supplies';
            } else if (rawType.includes('2B') || rawType === 'GSTR_2B') {
              badgeLabel = '2B';
              title = 'GSTR-2B Auto-Drafted ITC';
            } else if (rawType.includes('9C')) {
              badgeLabel = '9C';
              title = 'GSTR-9C Reconciliation Statement';
            } else if (rawType.includes('9')) {
              badgeLabel = '9';
              title = 'GSTR-9 Annual Return';
            } else if (rawType.includes('CMP') || rawType === 'CMP_08') {
              badgeLabel = 'CMP';
              title = 'CMP-08 Quarterly Statement';
            }

            const rawStatus = (row.filing_status || row.status || 'Not Started').toString();

            return {
              id: row.id,
              type: badgeLabel,
              title: row.title || title,
              period: row.filing_period || row.period || 'Current Period',
              status: rawStatus,
              dateOfFiling: row.date_of_filing || row.filed_at || null,
              dueDate: row.due_date || null,
              arn: row.arn_number || row.arn || null,
            };
          });
          if (isMounted) {
            setClientComplianceRecords(formatted);
          }
        }
      } catch (err: any) {
        console.warn('Failed to fetch compliance in App.tsx:', err?.message);
        if (isMounted) {
          setClientComplianceRecords([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCompliance(false);
        }
      }
    }

    fetchCompliance();
    return () => {
      isMounted = false;
    };
  }, [activeClientId]);

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
                {currentUser ? (
                  <Button
                    size="sm"
                    onClick={() => setCurrentRoute('dashboard')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold shadow-sm"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentRoute('login')} className="text-slate-600 hover:text-slate-900">
                      Sign In
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setCurrentRoute('signup')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold shadow-sm"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </>
                )}
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
                {currentUser ? (
                  <Button
                    size="lg"
                    onClick={() => setCurrentRoute('dashboard')}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-base px-6 font-semibold shadow-sm"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      onClick={() => setCurrentRoute('signup')}
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-base px-6 font-semibold shadow-sm"
                    >
                      <span>Get Started</span>
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
                  </>
                )}
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

                  {/* Google OAuth Button */}
                  <GoogleSignInButton label="Continue with Google" />

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2.5 text-slate-400 font-semibold tracking-wider">
                        Or continue with email
                      </span>
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRealLogin} className="space-y-4">
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
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
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
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          id="password-preview"
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          id="toggle-login-password-btn"
                          onClick={() => setShowLoginPassword((prev) => !prev)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-0.5 rounded transition-colors"
                          aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                          title={showLoginPassword ? 'Hide password' : 'Show password'}
                        >
                          {showLoginPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" disabled={loginLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-sm cursor-pointer disabled:opacity-50">
                      <span>{loginLoading ? 'Signing In...' : 'Sign In & Continue'}</span>
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

                  {/* Google OAuth Button */}
                  <GoogleSignInButton label="Sign up with Google" />

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2.5 text-slate-400 font-semibold tracking-wider">
                        Or register with email
                      </span>
                    </div>
                  </div>

                  {signupError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{signupError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRealSignup} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        CA Firm Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={signupFirmName}
                          onChange={(e) => setSignupFirmName(e.target.value)}
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
                          value={signupFullName}
                          onChange={(e) => setSignupFullName(e.target.value)}
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
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
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
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          required
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          id="toggle-signup-password-btn"
                          onClick={() => setShowSignupPassword((prev) => !prev)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-0.5 rounded transition-colors"
                          aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                          title={showSignupPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSignupPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" disabled={signupLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-sm cursor-pointer disabled:opacity-50">
                      <span>{signupLoading ? 'Creating Account...' : 'Create Firm Account'}</span>
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
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0 sticky top-0 z-30 gap-4">
            <div className="flex items-center gap-3 shrink-0">
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

            {/* Central Client Workspace Switcher Header */}
            <div className="flex-1 max-w-md flex justify-center">
              <ClientSwitcher
                onOpenNewClientModal={() => {
                  setActiveTab('clients');
                  setIsAddClientModalOpen(true);
                }}
              />
            </div>

            <div className="flex items-center gap-4 shrink-0">
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
                      </div>
                      <p className="text-slate-500 mt-1 text-sm">
                        Managed compliance for {clients.length} active client {clients.length === 1 ? 'entity' : 'entities'} under {firmName}
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
                      <p className="text-3xl font-bold mt-2 text-slate-900">{clients.length}</p>
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <span>Registered client entities</span>
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
                      <p className="text-3xl font-bold mt-2 text-slate-900">
                        {documents.filter((d) => d.status === 'uploaded' || d.status === 'processing').length}
                      </p>
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
                      <p className="text-3xl font-bold mt-2 text-slate-900">{exceptionsCount}</p>
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
                      <p className="text-3xl font-bold mt-2 text-slate-900">{reconciledCount}</p>
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
                          {clients.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Building2 className="w-8 h-8 text-slate-300" />
                                  <p className="text-sm font-semibold text-slate-700">No client reconciliations queued</p>
                                  <p className="text-xs text-slate-400">Add a client organization to start tracking compliance and variance.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            clients.map((client) => (
                              <tr key={client.id} className="hover:bg-slate-50 cursor-default transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900">{client.name}</div>
                                  <div className="text-xs text-slate-500 font-mono">GSTIN: {client.gstin}</div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-700">Current Period</td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    Active
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">&inr;0.00</td>
                                <td className="px-6 py-4">
                                  <span
                                    onClick={() => {
                                      setSelectedClientId(client.id);
                                      setActiveTab('reconciliation');
                                    }}
                                    className="text-indigo-600 hover:text-indigo-700 font-medium text-xs cursor-pointer"
                                  >
                                    Draft Report
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
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
                      const selectedClient = clients.find((c) => c.id === selectedClientId) || currentClient || clients[0];
                      if (!selectedClient) {
                        return (
                          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <h3 className="text-base font-bold text-slate-800">No Client Selected</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-4">Select or register a client entity to view its workspace.</p>
                            <Button onClick={() => setSelectedClientId(null)} size="sm">Back to Clients Roster</Button>
                          </div>
                        );
                      }
                      const stateCode = selectedClient.gstin ? selectedClient.gstin.slice(0, 2) : '27';

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
                                      <Calendar className="w-3 h-3 text-purple-500 shrink-0" />
                                      <select
                                        value={activeFY}
                                        onChange={(e) => setActiveFY(e.target.value)}
                                        className="bg-transparent text-purple-700 font-medium text-xs border-none focus:outline-none cursor-pointer pr-1"
                                      >
                                        {financialYears.map((fy) => (
                                          <option key={fy} value={fy} className="bg-white text-slate-800">
                                            {fy}
                                          </option>
                                        ))}
                                      </select>
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
                                  <p className="text-3xl font-bold mt-2.5 text-slate-900">
                                    {activeClientMetrics.isLoading ? (
                                      <span className="inline-block w-12 h-8 bg-slate-100 rounded animate-pulse" />
                                    ) : (
                                      activeClientMetrics.totalInvoices.toLocaleString('en-IN')
                                    )}
                                  </p>
                                  <div className="mt-2 text-xs text-slate-500 font-medium">
                                    {activeClientMetrics.isLoading
                                      ? 'Loading count...'
                                      : `${activeClientMetrics.purchaseCount} Purchase \u2022 ${activeClientMetrics.salesCount} Sales`}
                                  </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    ITC Eligible (2B)
                                  </p>
                                  <p className="text-3xl font-bold mt-2.5 text-emerald-600 font-mono">
                                    {activeClientMetrics.isLoading ? (
                                      <span className="inline-block w-24 h-8 bg-slate-100 rounded animate-pulse" />
                                    ) : (
                                      `₹${activeClientMetrics.itcEligible.toLocaleString('en-IN')}`
                                    )}
                                  </p>
                                  <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>
                                      {activeClientMetrics.isLoading
                                        ? 'Fetching portal data...'
                                        : activeClientMetrics.totalInvoices === 0
                                        ? 'No ITC records'
                                        : 'Auto-drafted from GST Portal'}
                                    </span>
                                  </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Matched In Books
                                  </p>
                                  <p className="text-3xl font-bold mt-2.5 text-indigo-600 font-mono">
                                    {activeClientMetrics.isLoading ? (
                                      <span className="inline-block w-16 h-8 bg-slate-100 rounded animate-pulse" />
                                    ) : (
                                      `${activeClientMetrics.matchedPercentage}%`
                                    )}
                                  </p>
                                  <div className="mt-2 text-xs text-indigo-600 font-medium">
                                    {activeClientMetrics.isLoading
                                      ? 'Calculating...'
                                      : `${activeClientMetrics.matchedCount} invoices reconciled`}
                                  </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Pending Exceptions
                                  </p>
                                  <p className="text-3xl font-bold mt-2.5 text-rose-600 font-mono">
                                    {activeClientMetrics.isLoading ? (
                                      <span className="inline-block w-20 h-8 bg-slate-100 rounded animate-pulse" />
                                    ) : (
                                      `₹${activeClientMetrics.pendingExceptionsAmount.toLocaleString('en-IN')}`
                                    )}
                                  </p>
                                  <div className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>
                                      {activeClientMetrics.isLoading
                                        ? 'Checking anomalies...'
                                        : activeClientMetrics.pendingExceptionsCount === 0
                                        ? '0 pending exceptions'
                                        : `${activeClientMetrics.pendingExceptionsCount} missing in Purchase Register`}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <h3 className="font-bold text-slate-900 text-base">Filing Compliance Status</h3>
                                      <p className="text-xs text-slate-500">GSTR filings timeline for {activeFY}</p>
                                    </div>
                                    <span className="text-xs font-mono font-semibold text-slate-400">
                                      GSTIN: {selectedClient.gstin}
                                    </span>
                                  </div>

                                  {isLoadingCompliance ? (
                                    <div className="py-8 flex flex-col items-center justify-center text-center">
                                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mb-2" />
                                      <p className="text-xs text-slate-500">Loading compliance records...</p>
                                    </div>
                                  ) : clientComplianceRecords.length === 0 ? (
                                    <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center">
                                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2.5">
                                        <FileCheck className="w-5 h-5 text-slate-400" />
                                      </div>
                                      <p className="text-sm font-semibold text-slate-700">No compliance records found</p>
                                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                        Statutory filing records and return statuses will appear here once tracked or filed for this client.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {clientComplianceRecords.map((item) => {
                                        const normStatus = (item.status || '').toUpperCase();
                                        const isFiled = normStatus === 'FILED';
                                        const isOverdue = normStatus === 'OVERDUE';
                                        const isReady =
                                          normStatus.includes('READY') ||
                                          normStatus.includes('PREP') ||
                                          normStatus.includes('APPROVAL');

                                        return (
                                          <div
                                            key={item.id}
                                            className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                                              isReady
                                                ? 'border-amber-200/80 bg-amber-50/40'
                                                : isOverdue
                                                ? 'border-rose-200/80 bg-rose-50/40'
                                                : 'border-slate-100 bg-slate-50/60'
                                            }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <div
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                                  isFiled
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : isOverdue
                                                    ? 'bg-rose-100 text-rose-700'
                                                    : isReady
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-slate-200 text-slate-700'
                                                }`}
                                              >
                                                {item.type}
                                              </div>
                                              <div>
                                                <div className="font-bold text-slate-900 text-sm">{item.title}</div>
                                                <div className="text-xs text-slate-500">
                                                  Period: {item.period}
                                                  {item.dateOfFiling
                                                    ? ` • Filed on ${item.dateOfFiling}`
                                                    : item.dueDate
                                                    ? ` • Due by ${item.dueDate}`
                                                    : ''}
                                                  {item.arn ? ` • ARN: ${item.arn}` : ''}
                                                </div>
                                              </div>
                                            </div>
                                            <span
                                              className={`px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider ${
                                                isFiled
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : isOverdue
                                                  ? 'bg-rose-100 text-rose-800'
                                                  : isReady
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : 'bg-slate-100 text-slate-800'
                                              }`}
                                            >
                                              {item.status}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
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
                              {clients.length} Entities
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
                              {(() => {
                                const filteredClients = clients.filter(
                                  (c) =>
                                    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                    c.gstin.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                    c.pan.toLowerCase().includes(clientSearchQuery.toLowerCase())
                                );

                                if (filteredClients.length === 0) {
                                  return (
                                    <tr>
                                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                          <Building2 className="w-8 h-8 text-slate-300" />
                                          <p className="text-sm font-semibold text-slate-700">
                                            {clientSearchQuery ? 'No matching clients found' : 'No client organizations registered yet'}
                                          </p>
                                          <p className="text-xs text-slate-400">
                                            {clientSearchQuery
                                              ? `No client matched "${clientSearchQuery}".`
                                              : `Add your first taxpayer entity to start GST compliance and reconciliation.`}
                                          </p>
                                          {!clientSearchQuery && (
                                            <Button
                                              onClick={() => {
                                                setAddClientError('');
                                                setNewClientName('');
                                                setNewClientGstin('');
                                                setNewClientPan('');
                                                setIsAddClientModalOpen(true);
                                              }}
                                              className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs gap-1.5 cursor-pointer"
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                              <span>Register First Client</span>
                                            </Button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }

                                return filteredClients.map((client) => {
                                  const formattedDate = client.created_at
                                    ? new Date(client.created_at).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })
                                    : 'Recent';

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
                                                onClick={async () => {
                                                  try {
                                                    const supabase = createClient();
                                                    await supabase.from('clients').delete().eq('id', client.id);
                                                    await refreshClients();
                                                    if (selectedClientId === client.id) {
                                                      setSelectedClientId(null);
                                                    }
                                                  } catch (err) {
                                                    console.warn('Error deleting client from Supabase:', err);
                                                  }
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
                                });
                              })()}
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

                            if (clients.some((c) => c.gstin === newClientGstin)) {
                              setAddClientError(`A client with GSTIN ${newClientGstin} already exists in your firm.`);
                              return;
                            }

                            try {
                              const supabase = createClient();

                              const {
                                data: { user },
                                error: userError,
                              } = await supabase.auth.getUser();

                              if (!user) {
                                setAddClientError('You must be logged in to register a client!');
                                return;
                              }

                              // 1. Fetch the user's firm_id dynamically from firm_users
                              const { data: firmUserRecord, error: fuError } = await supabase
                                .from('firm_users')
                                .select('firm_id')
                                .eq('user_id', user.id)
                                .limit(1)
                                .maybeSingle();

                              let targetFirmId = firmUserRecord?.firm_id;

                              // 2. Fallback: If no firm is linked yet, grab the first available firm or create one automatically
                              if (!targetFirmId) {
                                const { data: anyFirm } = await supabase.from('firms').select('id').limit(1).maybeSingle();
                                if (anyFirm?.id) {
                                  targetFirmId = anyFirm.id;
                                } else {
                                  // Create a fallback firm on the fly so it never fails
                                  const { data: newFirm } = await supabase
                                    .from('firms')
                                    .insert({ name: 'My CA Firm' })
                                    .select('id')
                                    .single();
                                  targetFirmId = newFirm?.id;

                                  if (targetFirmId) {
                                    await supabase.from('firm_users').insert({
                                      firm_id: targetFirmId,
                                      user_id: user.id,
                                      role: 'owner',
                                    });
                                  }
                                }
                              }

                              if (!targetFirmId) {
                                setAddClientError('No valid firm found for this user. Please complete onboarding.');
                                return;
                              }

                              // 3. Insert the client using the guaranteed valid firm_id
                              const { data: createdRow, error: insertError } = await supabase
                                .from('clients')
                                .insert({
                                  name: newClientName.trim(),
                                  gstin: newClientGstin,
                                  pan: derivedPan,
                                  firm_id: targetFirmId,
                                  user_id: user.id,
                                })
                                .select('id')
                                .single();

                              if (insertError) {
                                setAddClientError(insertError.message || 'Failed to register client entity.');
                                return;
                              }

                              await refreshClients();
                              if (createdRow?.id) {
                                setSelectedClientId(createdRow.id);
                              }
                              setIsAddClientModalOpen(false);
                              setNewClientName('');
                              setNewClientGstin('');
                              setNewClientPan('');
                            } catch (err: any) {
                              setAddClientError(err?.message || 'Failed to create client entity.');
                            }
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

                  {!activeClient ? (
                    <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
                      <div className="max-w-md mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
                          <Building2 className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">No Active Client Selected</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-6">
                          Please select an active client from the registered entities below or top workspace selector to view compliance documents.
                        </p>
                        {clients && clients.length > 0 ? (
                          <div className="w-full space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">
                              Select Client Entity:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                              {clients.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setSelectedClientId(c.id)}
                                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all group cursor-pointer"
                                >
                                  <div>
                                    <p className="font-semibold text-xs text-slate-900 group-hover:text-indigo-700">
                                      {c.name}
                                    </p>
                                    <p className="text-[11px] font-mono text-slate-400">{c.gstin}</p>
                                  </div>
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={() => {
                              setActiveTab('clients');
                              setIsAddClientModalOpen(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm gap-2 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add New Client</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Active Client Context Banner */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                            {activeClient.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                Active Client Workspace
                              </span>
                              <span className="text-xs text-slate-400 font-mono">ID: {activeClient.id.substring(0, 8)}...</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mt-0.5">{activeClient.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span>GSTIN: <strong className="font-mono text-slate-700">{activeClient.gstin}</strong></span>
                              {activeClient.pan && (
                                <>
                                  <span>&bull;</span>
                                  <span>PAN: <strong className="font-mono text-slate-700">{activeClient.pan}</strong></span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(null);
                              setCurrentClient(null);
                            }}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Change Client
                          </button>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">Client Compliance Vault</h3>
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
                                  const clientObj = clients.find((c) => c.id === doc.client_id);
                                  const clientDisplayName = doc.client_name || doc.client_trade_name || clientObj?.name || clientObj?.trade_name || '';
                                  return (
                                    docSearchQuery === '' ||
                                    doc.file_name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                                    doc.doc_type.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                                    clientDisplayName.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                                    (doc.client_trade_name && doc.client_trade_name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                                  );
                                })
                                .map((doc) => {
                                  const clientObj = clients.find((c) => c.id === doc.client_id);
                                  const clientDisplayName = doc.client_name || doc.client_trade_name || clientObj?.name || clientObj?.trade_name || activeClient?.name || 'Taxpayer Entity';
                                  const clientTradeName = doc.client_trade_name || clientObj?.trade_name;
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
                                          type="button"
                                          onClick={() => {
                                            setSelectedClientId(doc.client_id);
                                            setClientWorkspaceTab('documents');
                                            setActiveTab('clients');
                                          }}
                                          className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer text-left"
                                        >
                                          <span className="block font-semibold">{clientDisplayName}</span>
                                          {clientTradeName && clientTradeName !== clientDisplayName && (
                                            <span className="block text-[10px] text-slate-400 font-normal">{clientTradeName}</span>
                                          )}
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
                    </>
                  )}
                </div>
              )}

              {activeTab === 'reconciliation' && (
                <div className="flex flex-col gap-6 max-w-7xl">
                  {clients.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                      <div className="max-w-md mx-auto flex flex-col items-center">
                        <Building2 className="w-12 h-12 text-indigo-400 mb-3" />
                        <h3 className="text-lg font-bold text-slate-800">No Clients Available</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-6">
                          Please register a client organization in the Clients tab to start automated reconciliation.
                        </p>
                        <Button
                          onClick={() => {
                            setActiveTab('clients');
                            setIsAddClientModalOpen(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add New Client</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ReconciliationView
                      clientId={selectedClientId || currentClient?.id || clients[0]?.id || ''}
                      clientName={currentClient?.name || clients.find((c) => c.id === selectedClientId)?.name || clients[0]?.name || ''}
                      clientGstin={currentClient?.gstin || clients.find((c) => c.id === selectedClientId)?.gstin || clients[0]?.gstin || ''}
                      initialPeriodMonth={10}
                      initialPeriodYear={2023}
                    />
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
