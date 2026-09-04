import { z } from 'zod';

/**
 * Zod schema for a single extracted GST invoice.
 * Numeric columns are strictly typed to prevent LLMs from hallucinating string values.
 */
export const extractedInvoiceSchema = z.object({
  invoice_number: z
    .string()
    .min(1)
    .describe('The unique invoice or bill number as recorded on the document (e.g. INV-2023-001).'),
  supplier_gstin: z
    .string()
    .length(15)
    .describe('15-character Goods and Services Tax Identification Number (GSTIN) of the supplier or vendor.'),
  invoice_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD')
    .describe('Invoice date in YYYY-MM-DD ISO format.'),
  taxable_value: z
    .number()
    .describe('Taxable base value or subtotal before taxes as a numeric value.'),
  cgst: z
    .number()
    .default(0)
    .describe('Central GST amount as a number. 0 if not applicable or inter-state.'),
  sgst: z
    .number()
    .default(0)
    .describe('State/UT GST amount as a number. 0 if not applicable or inter-state.'),
  igst: z
    .number()
    .default(0)
    .describe('Integrated GST amount as a number. 0 if intra-state.'),
  total_amount: z
    .number()
    .describe(
      'Total invoice amount including all taxes. Must satisfy total_amount = taxable_value + cgst + sgst + igst.'
    ),
});

export type ExtractedInvoice = z.infer<typeof extractedInvoiceSchema>;

/**
 * Top-level schema for structured extraction of an array of invoices.
 */
export const invoicesExtractionSchema = z.object({
  invoices: z
    .array(extractedInvoiceSchema)
    .describe('Array of extracted invoice line items matching the database schema.'),
});

export type InvoicesExtractionResult = z.infer<typeof invoicesExtractionSchema>;
