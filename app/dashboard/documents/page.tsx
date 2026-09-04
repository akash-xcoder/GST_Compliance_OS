import React from 'react';
import { ScopedDocumentsView } from '@/components/documents/ScopedDocumentsView';

export const dynamic = 'force-dynamic';

export default function DocumentsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Document Ingestion & Vault
        </h2>
        <p className="text-slate-500 mt-1 text-sm">
          Multi-tenant client storage, purchase registers, and Gemini OCR extraction pipelines
        </p>
      </div>

      <ScopedDocumentsView />
    </div>
  );
}

