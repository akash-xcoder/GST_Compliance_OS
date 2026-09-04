'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Hash,
  CreditCard,
  Calendar,
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  Clock,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Download,
  Search,
  Filter,
  ExternalLink,
  Copy,
  Check,
  FileCheck,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Uploader } from '@/components/documents/Uploader';
import { extractDocumentData } from './extract-actions';
import { ReconciliationView } from '@/components/reconciliation/ReconciliationView';

export interface ClientDetail {
  id: string;
  firm_id: string;
  name: string;
  gstin: string;
  pan: string;
  created_at?: string;
}

export interface DocumentRecord {
  id: string;
  client_id: string;
  firm_id: string;
  storage_path: string;
  doc_type: string;
  period_month: number;
  period_year: number;
  file_name?: string;
  file_size?: number;
  status: string;
  created_at: string;
}

interface ClientWorkspaceClientProps {
  client: ClientDetail;
  firmName?: string;
  firmId?: string;
  initialDocuments?: DocumentRecord[];
  uploader?: React.ReactNode;
}

export function ClientWorkspaceClient({
  client,
  firmName = 'CA Practice',
  firmId,
  initialDocuments = [],
  uploader,
}: ClientWorkspaceClientProps) {
  const effectiveFirmId = client.firm_id || firmId || '';
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'reconciliation'>('overview');
  const [activeFY, setActiveFY] = useState('FY 2023-24');
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [docFilter, setDocFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);
  const [extractionAlert, setExtractionAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Derive state code from first 2 digits of GSTIN
  const stateCode = client.gstin.slice(0, 2);

  const handleDocumentUploaded = (newDoc: DocumentRecord) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const handleExtract = async (docId: string) => {
    setExtractingDocId(docId);
    setExtractionAlert(null);

    // Optimistically update document status to 'processing'
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: 'processing' } : d))
    );

    try {
      const res = await extractDocumentData(docId);
      if (res.success) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, status: 'extracted' } : d))
        );
        setExtractionAlert({
          type: 'success',
          message:
            res.message ||
            `AI Extraction Complete: ${res.extractedCount ?? 0} invoices extracted and saved to database (${
              res.source === 'books' ? 'Books of Accounts' : 'GSTR-2B'
            }).`,
        });
        // Refresh the page to synchronize server state
        router.refresh();
      } else {
        setDocuments((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, status: 'failed' } : d))
        );
        setExtractionAlert({
          type: 'error',
          message: res.error || 'Extraction failed. Please verify API key and document format.',
        });
      }
    } catch (err: any) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: 'failed' } : d))
      );
      setExtractionAlert({
        type: 'error',
        message: err?.message || 'Failed to trigger extraction action.',
      });
    } finally {
      setExtractingDocId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const getMonthName = (m: number) => {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[m - 1] || `M${m}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesFilter = docFilter === 'all' || doc.doc_type === docFilter;
    const matchesSearch =
      searchQuery === '' ||
      (doc.file_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.storage_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doc_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href="/dashboard/clients"
          className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Clients</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="font-semibold text-slate-900 truncate max-w-xs">{client.name}</span>
      </nav>

      {/* Workspace Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{client.name}</h2>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Active Taxpayer</span>
                </span>
              </div>

              {/* Badges: GSTIN, PAN, State, FY */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 font-mono text-xs font-semibold text-slate-800 border border-slate-200">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span>GSTIN: {client.gstin}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 font-mono text-xs font-semibold text-amber-900 border border-amber-200">
                  <CreditCard className="w-3 h-3 text-amber-600" />
                  <span>PAN: {client.pan}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium text-xs border border-indigo-100">
                  <span>State Code: {stateCode}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-medium text-xs border border-purple-100">
                  <Calendar className="w-3 h-3 text-purple-500" />
                  <span>{activeFY}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Header CTA Buttons */}
          <div className="flex items-center gap-2.5 self-start lg:self-center">
            <Button
              onClick={() => setActiveTab('documents')}
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Invoices</span>
            </Button>
            <Button
              onClick={() => setActiveTab('reconciliation')}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run 2B Match</span>
            </Button>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-100 mt-6 pt-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'documents'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {documents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === 'reconciliation'
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

      {/* Tab 1: Client Overview */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* 4 Client-Specific Metric Cards */}
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

          {/* Filing Cadence & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Filing Cadence */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Filing Compliance Status</h3>
                  <p className="text-xs text-slate-500">GSTR filings timeline for {activeFY}</p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-400">
                  GSTIN: {client.gstin}
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

            {/* Quick Actions & CA Notes */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1">Entity Workflow</h3>
                <p className="text-xs text-slate-500 mb-4">Direct actions for this taxpayer</p>

                <div className="space-y-2.5">
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Upload className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-800">Upload Purchase Register</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setActiveTab('reconciliation')}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <RefreshCw className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-800">Execute 2B Cross-Match</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => alert(`Exporting audit dossier for ${client.name}...`)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Download className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-800">Export CA Audit Pack</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Multi-tenant partitioned under {firmName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Documents Tab - Uploader & Document List UI */}
      {activeTab === 'documents' && (
        <div className="flex flex-col gap-6">
          {/* Uploader Component */}
          {uploader && React.isValidElement(uploader) ? (
            React.cloneElement(uploader as React.ReactElement<any>, {
              firmId: effectiveFirmId,
              clientId: client.id,
              clientName: client.name,
              onUploadSuccess: handleDocumentUploaded,
            })
          ) : (
            <Uploader
              firmId={effectiveFirmId}
              clientId={client.id}
              clientName={client.name}
              onUploadSuccess={handleDocumentUploaded}
            />
          )}

          {/* Document Repository List Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            {/* Header with Search and Type Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">Compliance Documents</h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    {filteredDocuments.length} {filteredDocuments.length === 1 ? 'file' : 'files'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stored in Supabase Storage isolated under folder <code className="text-indigo-600 font-mono text-[11px]">{firmId.slice(0, 8)}.../{client.id.slice(0, 8)}...</code>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white w-full sm:w-56"
                  />
                </div>

                {/* Filter Dropdown */}
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

            {/* Extraction Notice / Alert */}
            {extractionAlert && (
              <div
                className={`mb-4 p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                  extractionAlert.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {extractionAlert.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">
                      {extractionAlert.type === 'success' ? 'Extraction Successful' : 'Extraction Notice'}
                    </p>
                    <p className="mt-0.5 leading-relaxed">{extractionAlert.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExtractionAlert(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Document Data Table */}
            {filteredDocuments.length > 0 ? (
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
                    {filteredDocuments.map((doc) => {
                      const isExcel = doc.file_name?.match(/\.(xlsx|xls|csv)$/i);
                      const isPdf = doc.file_name?.match(/\.pdf$/i);
                      const isJson = doc.file_name?.match(/\.json$/i);
                      const isProcessingThis = extractingDocId === doc.id || doc.status === 'processing';

                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Filename & Format Icon */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  isExcel
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : isPdf
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                    : isJson
                                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                }`}
                              >
                                {isExcel ? (
                                  <FileSpreadsheet className="w-4 h-4" />
                                ) : isPdf ? (
                                  <FileText className="w-4 h-4" />
                                ) : (
                                  <FileCheck className="w-4 h-4" />
                                )}
                              </div>
                              <div className="truncate max-w-xs sm:max-w-sm">
                                <p className="font-semibold text-slate-900 truncate">
                                  {doc.file_name || doc.storage_path.split('/').pop() || 'compliance_doc'}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  {formatFileSize(doc.file_size)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Document Type Badge */}
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

                          {/* Tax Period */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 font-mono text-[11px] font-semibold text-slate-800 border border-slate-200">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>
                                {getMonthName(doc.period_month)} {doc.period_year} ({String(doc.period_month).padStart(2, '0')}/{doc.period_year})
                              </span>
                            </div>
                          </td>

                          {/* Upload Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {new Date(doc.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {doc.status === 'extracted' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Extracted</span>
                              </span>
                            ) : isProcessingThis ? (
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
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                <span className="capitalize">{doc.status || 'Uploaded'}</span>
                              </span>
                            )}
                          </td>

                          {/* AI Extraction Action Button */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            {doc.status === 'uploaded' || doc.status === 'failed' ? (
                              <Button
                                size="sm"
                                disabled={isProcessingThis}
                                onClick={() => handleExtract(doc.id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-7 px-3 gap-1.5 cursor-pointer shadow-xs transition-all"
                              >
                                {isProcessingThis ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Extracting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                                    <span>Extract Data</span>
                                  </>
                                )}
                              </Button>
                            ) : isProcessingThis ? (
                              <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                <span>Gemini 1.5 Pro...</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Invoices Populated</span>
                              </div>
                            )}
                          </td>

                          {/* Storage Path / Copy */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => copyToClipboard(doc.storage_path)}
                              title={doc.storage_path}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono border border-slate-200 transition-colors cursor-pointer"
                            >
                              {copiedPath === doc.storage_path ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-slate-400" />
                                  <span className="truncate max-w-[120px]">
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
            ) : (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-800 text-sm">No compliance documents found</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {searchQuery || docFilter !== 'all'
                    ? 'No documents match your filter criteria. Try resetting search or type filter.'
                    : 'Upload Purchase Registers, GSTR-2B JSON, or invoice PDFs above to start automated reconciliation.'}
                </p>
                {(searchQuery || docFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setDocFilter('all');
                    }}
                    className="mt-3 text-xs"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Deterministic Reconciliation Engine */}
      {activeTab === 'reconciliation' && (
        <ReconciliationView
          clientId={client.id}
          clientName={client.name}
          clientGstin={client.gstin}
          initialPeriodMonth={10}
          initialPeriodYear={2023}
        />
      )}
    </div>
  );
}
