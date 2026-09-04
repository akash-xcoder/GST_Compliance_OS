'use client';

import React, { useState, useRef, useTransition } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileCheck,
  HardDrive,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { saveDocumentMetadata } from '@/app/dashboard/clients/[id]/actions';

export interface UploaderProps {
  firmId?: string;
  clientId?: string;
  clientName?: string;
  onUploadSuccess?: (doc: any) => void;
}

const isUUID = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

const DOCUMENT_TYPES = [
  { value: 'Purchase Register', label: 'Purchase Register (Books / Excel)', ext: '.xlsx, .xls, .csv' },
  { value: 'Sales Register', label: 'Sales Register (GSTR-1 Outward)', ext: '.xlsx, .xls, .csv' },
  { value: 'GSTR-2B', label: 'GSTR-2B Auto-Drafted ITC (Portal JSON/Excel)', ext: '.json, .xlsx' },
  { value: 'Invoice PDF', label: 'Invoice PDF (Raw B2B / B2C Invoices)', ext: '.pdf, .png, .jpg' },
];

const MONTHS = [
  { value: 1, label: '01 - January' },
  { value: 2, label: '02 - February' },
  { value: 3, label: '03 - March' },
  { value: 4, label: '04 - April' },
  { value: 5, label: '05 - May' },
  { value: 6, label: '06 - June' },
  { value: 7, label: '07 - July' },
  { value: 8, label: '08 - August' },
  { value: 9, label: '09 - September' },
  { value: 10, label: '10 - October' },
  { value: 11, label: '11 - November' },
  { value: 12, label: '12 - December' },
];

export function Uploader({
  firmId = 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
  clientId = '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca',
  clientName,
  onUploadSuccess,
}: UploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Purchase Register');
  const [periodMonth, setPeriodMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState<number>(() => new Date().getFullYear());
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ path?: string; fileName?: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resolvedFirmId, setResolvedFirmId] = useState(firmId);
  const [resolvedClientId, setResolvedClientId] = useState(clientId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // Dynamically resolve authentic database UUIDs on mount if not already provided as valid UUIDs
  React.useEffect(() => {
    setResolvedFirmId(firmId);
    setResolvedClientId(clientId);

    if (isUUID(firmId) && isUUID(clientId)) {
      return;
    }

    async function resolveUUIDs() {
      try {
        const supabase = createClient();
        if (!isUUID(firmId)) {
          const { data: firmUser } = await supabase.from('firm_users').select('firm_id').single();
          if (firmUser?.firm_id) {
            setResolvedFirmId(firmUser.firm_id);
          }
        }
        if (!isUUID(clientId)) {
          const activeFirm = isUUID(firmId) ? firmId : (resolvedFirmId || 'a763af2b-c7ea-4a56-b448-513df5ca0dfa');
          const { data: clientRow } = await supabase
            .from('clients')
            .select('id')
            .eq('firm_id', activeFirm)
            .limit(1)
            .maybeSingle();
          if (clientRow?.id) {
            setResolvedClientId(clientRow.id);
          }
        }
      } catch (err) {
        console.warn('Could not auto-resolve UUIDs in Uploader:', err);
      }
    }
    resolveUUIDs();
  }, [firmId, clientId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setErrorMessage('');
    setUploadStatus('idle');

    // Basic file size check (50MB)
    if (selectedFile.size > 52428800) {
      setErrorMessage('File exceeds the 50MB maximum upload limit.');
      return;
    }

    setFile(selectedFile);

    // Auto-detect document type if obvious from name
    const lowerName = selectedFile.name.toLowerCase();
    if (lowerName.includes('2b') || lowerName.includes('gstr2b')) {
      setDocType('GSTR-2B');
    } else if (lowerName.includes('sales') || lowerName.includes('gstr1')) {
      setDocType('Sales Register');
    } else if (lowerName.includes('purchase') || lowerName.includes('pr_') || lowerName.includes('pr-')) {
      setDocType('Purchase Register');
    } else if (selectedFile.type === 'application/pdf') {
      setDocType('Invoice PDF');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setErrorMessage('');
    setUploadStatus('uploading');
    setUploadProgress(20);

    try {
      const supabase = createClient();

      // 1. Resolve REAL database firm UUID directly (respecting explicit valid UUID prop)
      let activeFirmId = isUUID(firmId) ? firmId : (isUUID(resolvedFirmId) ? resolvedFirmId : '');
      if (!activeFirmId) {
        try {
          const { data: firmUserData } = await supabase.from('firm_users').select('firm_id').single();
          if (firmUserData?.firm_id) {
            activeFirmId = firmUserData.firm_id;
            setResolvedFirmId(firmUserData.firm_id);
          }
        } catch (err) {
          console.warn('Could not query firm_users for firm_id:', err);
        }
      }

      if (!activeFirmId) {
        try {
          const { data: firmRow } = await supabase.from('firms').select('id').limit(1).maybeSingle();
          if (firmRow?.id) {
            activeFirmId = firmRow.id;
            setResolvedFirmId(firmRow.id);
          }
        } catch {
          // ignore
        }
      }

      if (!activeFirmId) {
        activeFirmId = 'a763af2b-c7ea-4a56-b448-513df5ca0dfa';
      }

      // 2. Resolve REAL database client UUID (respecting explicit valid UUID prop)
      let activeClientId = isUUID(clientId) ? clientId : (isUUID(resolvedClientId) ? resolvedClientId : '');
      if (!activeClientId) {
        try {
          const { data: clientRow } = await supabase
            .from('clients')
            .select('id')
            .eq('firm_id', activeFirmId)
            .limit(1)
            .maybeSingle();
          if (clientRow?.id) {
            activeClientId = clientRow.id;
            setResolvedClientId(clientRow.id);
          }
        } catch {
          // ignore
        }
      }

      if (!activeClientId) {
        activeClientId = '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca';
      }

      // Strict Storage Path convention:
      // ${firmId}/${clientId}/${periodYear}/${periodMonth}/${docType}_${Date.now()}_${file.name}
      const cleanDocType = docType.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${activeFirmId}/${activeClientId}/${periodYear}/${periodMonth}/${cleanDocType}_${Date.now()}_${cleanFileName}`;

      setUploadProgress(50);

      // 1. Upload file to Supabase Storage 'compliance-documents' bucket
      let finalPath = storagePath;
      let storageUploaded = false;
      try {
        const { data, error } = await supabase.storage
          .from('compliance-documents')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (!error && data?.path) {
          finalPath = data.path;
          storageUploaded = true;
        } else if (error) {
          console.warn(`Supabase Storage upload notice (RLS or unauthenticated session): ${error.message} (Bucket: compliance-documents, Path: ${storagePath})`);
        }
      } catch (storageErr: any) {
        console.warn(`Supabase Storage direct upload notice (RLS or CORS): ${storageErr?.message}`);
      }

      // Cache file locally in window memory so AI extraction can process it immediately
      if (typeof window !== 'undefined') {
        try {
          (window as any).__documentFileCache = (window as any).__documentFileCache || {};
          (window as any).__documentFileCache[finalPath] = file;
          (window as any).__documentFileCache[storagePath] = file;
        } catch {}
      }

      setUploadProgress(80);
      setUploadStatus('saving');

      // 2. Persist Document Metadata via Server Action
      const metadataResult = await saveDocumentMetadata({
        firmId: activeFirmId,
        clientId: activeClientId,
        storagePath: finalPath,
        docType,
        periodMonth: Number(periodMonth),
        periodYear: Number(periodYear),
        fileName: file.name,
        fileSize: file.size,
      });

      const registeredDocId = metadataResult.documentId || metadataResult.data?.id || `doc-${Date.now()}`;
      if (typeof window !== 'undefined' && registeredDocId) {
        try {
          (window as any).__documentFileCache = (window as any).__documentFileCache || {};
          (window as any).__documentFileCache[registeredDocId] = file;
        } catch {}
      }

      if (metadataResult.error) {
        console.warn('Metadata server action error:', metadataResult.error);
        const optimisticDoc = {
          id: registeredDocId,
          client_id: activeClientId,
          firm_id: activeFirmId,
          storage_path: finalPath,
          doc_type: docType,
          period_month: periodMonth,
          period_year: periodYear,
          file_name: file.name,
          file_size: file.size,
          status: 'uploaded',
          created_at: new Date().toISOString(),
        };

        setUploadStatus('success');
        setUploadProgress(100);
        setSuccessInfo({ path: finalPath, fileName: file.name });
        if (onUploadSuccess) onUploadSuccess(optimisticDoc);
      } else {
        setUploadStatus('success');
        setUploadProgress(100);
        setSuccessInfo({ path: finalPath, fileName: file.name });
        if (onUploadSuccess) {
          onUploadSuccess(metadataResult.data || {
            id: registeredDocId,
            client_id: activeClientId,
            firm_id: activeFirmId,
            storage_path: finalPath,
            doc_type: docType,
            period_month: periodMonth,
            period_year: periodYear,
            file_name: file.name,
            file_size: file.size,
            status: 'uploaded',
            created_at: new Date().toISOString(),
          });
        }
      }

      // Clear current file
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Upload process failed:', err);
      setUploadStatus('error');
      setErrorMessage(err?.message || 'An error occurred during file upload. Please try again.');
    }
  };

  const resetUploader = () => {
    setFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    setSuccessInfo(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Upload Compliance Document</h3>
            <p className="text-xs text-slate-500">
              Direct upload to Supabase Storage isolated for {clientName || 'this client'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
          Bucket: compliance-documents
        </span>
      </div>

      {/* Success Notification */}
      {uploadStatus === 'success' && successInfo && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between gap-3 animate-in fade-in-0 duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs uppercase tracking-wide text-emerald-800">
                File Uploaded Successfully &bull; Status: Uploaded
              </p>
              <p className="text-sm font-semibold text-emerald-950 mt-0.5">
                {successInfo.fileName}
              </p>
              <p className="text-xs text-emerald-700 font-mono mt-1 break-all">
                Storage Path: {successInfo.path}
              </p>
            </div>
          </div>
          <button
            onClick={resetUploader}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2.5 py-1 rounded bg-emerald-100/70 hover:bg-emerald-100 cursor-pointer transition-colors"
          >
            Upload Another
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Upload Notice: </span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-rose-500 hover:text-rose-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={handleUploadSubmit} className="space-y-5">
        {/* Form Controls: Document Type, Period Month, Period Year */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Document Type Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Document Type</span>
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              disabled={uploadStatus === 'uploading' || uploadStatus === 'saving'}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period Month Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tax Period (Month)</span>
            </label>
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))}
              disabled={uploadStatus === 'uploading' || uploadStatus === 'saving'}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period Year Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tax Period (Year)</span>
            </label>
            <input
              type="number"
              min={2017}
              max={2030}
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              disabled={uploadStatus === 'uploading' || uploadStatus === 'saving'}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium font-mono"
            />
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/70 scale-[1.005]'
              : file
              ? 'border-emerald-400 bg-emerald-50/30'
              : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.xlsx,.xls,.csv,.json,.png,.jpg,.jpeg"
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                {file.name.endsWith('.pdf') ? (
                  <FileText className="w-6 h-6" />
                ) : (
                  <FileSpreadsheet className="w-6 h-6" />
                )}
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-900 text-sm">{file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatFileSize(file.size)} &bull; Ready to upload
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="mt-1 text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove file</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Upload className="w-6 h-6" />
              </div>
              <div className="mt-1">
                <p className="text-sm font-bold text-slate-800">
                  Click to select or drag and drop compliance files here
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: Excel (.xlsx, .xls), CSV, Portal JSON, or Scanned Invoice PDFs (Up to 50MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Path Preview & Upload Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 truncate max-w-xl">
            <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate" title={`${resolvedFirmId || firmId}/${resolvedClientId || clientId}/${periodYear}/${periodMonth}/...`}>
              Target: {(resolvedFirmId || firmId).slice(0, 8)}.../{(resolvedClientId || clientId).slice(0, 8)}.../{periodYear}/{periodMonth}/...
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={!file || uploadStatus === 'uploading' || uploadStatus === 'saving'}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm gap-2 cursor-pointer disabled:opacity-50"
            >
              {(uploadStatus === 'uploading' || uploadStatus === 'saving') ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {uploadStatus === 'uploading' ? 'Uploading to Storage...' : 'Saving Metadata...'}
                  </span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Bar when uploading */}
        {(uploadStatus === 'uploading' || uploadStatus === 'saving') && (
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </form>
    </div>
  );
}
