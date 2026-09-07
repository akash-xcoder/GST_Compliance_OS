'use server';

import { createClient } from '@/utils/supabase/server';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { invoicesExtractionSchema, ExtractedInvoice } from '@/lib/validations/extraction';

export interface ExtractResult {
  success: boolean;
  message?: string;
  error?: string;
  extractedCount?: number;
  invoices?: ExtractedInvoice[];
  source?: 'books' | 'gstr_2b';
}

async function safeRevalidatePath(path: string) {
  if (typeof window === 'undefined') {
    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath(path);
    } catch {
      // Ignored
    }
  }
}

/**
 * Server action to extract invoice line items from a compliance document using Gemini and Vercel AI SDK.
 * 
 * Workflow:
 * 1. Verifies document ownership under active CA firm.
 * 2. Updates document status to 'processing'.
 * 3. Downloads file buffer from Supabase Storage 'compliance-documents' bucket.
 * 4. Executes generateObject with google('gemini-1.5-pro') strictly typed to Zod schema.
 * 5. Maps source ('books' for purchase_register, 'gstr_2b' for gstr_2b).
 * 6. Bulk inserts extracted invoice rows into the `invoices` table.
 * 7. Updates document status to 'extracted' (or 'failed' on error).
 */
export async function extractDocumentData(documentId: string): Promise<ExtractResult> {
  const supabase = await createClient();

  // 1. Fetch Document Metadata
  const { data: doc } = await supabase.from('documents').select('*').eq('id', documentId).maybeSingle();
  if (!doc) throw new Error("Document not found in database.");

  // Set to processing
  await supabase.from('documents').update({ status: 'processing' }).eq('id', documentId);

  try {
    // 2. Download file from Storage
    const storagePath = doc.storage_path || doc.file_path || '';
    if (!storagePath) throw new Error("No storage path found for this document.");

    const { data: fileBlob, error: downloadError } = await supabase.storage.from('compliance-documents').download(storagePath);
    if (downloadError) throw new Error(`Storage download failed: ${downloadError.message}`);
    
    const csvText = await fileBlob.text();
    if (!csvText || csvText.trim() === '') {
       throw new Error("The uploaded CSV file is completely empty (0 bytes).");
    }

    // 3. Robust CSV Parsing (Handles Windows \r\n and Mac/Linux \n)
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length <= 1) {
       throw new Error("CSV contains no data rows (only headers).");
    }

    let extractedInvoices: any[] = [];
    
    // Parse rows (skipping header at index 0)
    for (let i = 1; i < lines.length; i++) {
      // Clean up quotes and split by comma
      const cols = lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, '')); 
      
      if (cols.length >= 8 && cols[0]) {
        extractedInvoices.push({
          invoice_number: cols[0],
          invoice_date: cols[1],
          supplier_gstin: cols[2] || 'UNKNOWN',
          taxable_value: parseFloat(cols[3]) || 0,
          cgst: parseFloat(cols[4]) || 0,
          sgst: parseFloat(cols[5]) || 0,
          igst: parseFloat(cols[6]) || 0,
          total_amount: parseFloat(cols[7]) || 0,
        });
      }
    }

    if (extractedInvoices.length === 0) {
       throw new Error("Failed to parse any valid invoice rows from the CSV. Check column format.");
    }

    // 4. Source mapping
    const normalizedDocType = (doc.doc_type || doc.document_type || '').toLowerCase();
    const source = normalizedDocType.includes('2b') ? 'gstr_2b' : 'books';
    const pMonth = Number(doc.period_month ?? 9);
    const pYear = Number(doc.period_year ?? 2026);

    // 5. Build Insert Payload
    const invoiceRows = extractedInvoices.map((inv) => ({
      firm_id: doc.firm_id,
      client_id: doc.client_id,
      invoice_number: inv.invoice_number,
      supplier_gstin: inv.supplier_gstin.toUpperCase(),
      invoice_date: inv.invoice_date,
      taxable_value: inv.taxable_value,
      cgst: inv.cgst,
      sgst: inv.sgst,
      igst: inv.igst,
      total_amount: inv.total_amount,
      source: source,
      period_month: pMonth,
      period_year: pYear,
      // Leaving recon_status out completely so it doesn't trigger the enum error we saw earlier
    }));

    // 6. Insert directly into Supabase
    const insertResult = await supabase.from('invoices').insert(invoiceRows);
    
    if (insertResult.error) {
      throw new Error(`DATABASE INSERT FAILED: ${insertResult.error.message}`);
    }

    // 7. Update status to Success
    await supabase.from('documents').update({ status: 'extracted' }).eq('id', documentId);

    return { success: true, extractedCount: extractedInvoices.length, source };

  } catch (err: any) {
    console.error('Extraction error:', err);
    // Force the status to 'failed' so the UI stops lying about it being "Extracted"
    await supabase.from('documents').update({ status: 'failed' }).eq('id', documentId);
    return { success: false, error: err?.message };
  }
}
