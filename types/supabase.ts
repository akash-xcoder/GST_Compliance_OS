export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      firms: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      firm_users: {
        Row: {
          id: string;
          firm_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          firm_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          firm_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          firm_id: string;
          name: string;
          gstin: string;
          pan: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          firm_id: string;
          name: string;
          gstin: string;
          pan: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          firm_id?: string;
          name?: string;
          gstin?: string;
          pan?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          firm_id: string;
          client_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          document_type: string;
          source?: 'books' | 'gstr_2b' | string;
          period_month: number;
          period_year: number;
          status: 'pending' | 'processing' | 'processed' | 'failed';
          error_message?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          firm_id: string;
          client_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          document_type: string;
          source?: 'books' | 'gstr_2b' | string;
          period_month: number;
          period_year: number;
          status?: 'pending' | 'processing' | 'processed' | 'failed';
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          firm_id?: string;
          client_id?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          mime_type?: string;
          document_type?: string;
          source?: 'books' | 'gstr_2b' | string;
          period_month?: number;
          period_year?: number;
          status?: 'pending' | 'processing' | 'processed' | 'failed';
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          firm_id: string;
          client_id: string;
          document_id?: string | null;
          invoice_number: string;
          supplier_gstin: string;
          supplier_name?: string | null;
          invoice_date: string;
          taxable_value: number;
          cgst: number;
          sgst: number;
          igst: number;
          total_amount: number;
          source: 'books' | 'gstr_2b';
          period_month: number;
          period_year: number;
          recon_status?: string | null;
          status?: string | null;
          ai_explanation?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          firm_id: string;
          client_id: string;
          document_id?: string | null;
          invoice_number: string;
          supplier_gstin: string;
          supplier_name?: string | null;
          invoice_date: string;
          taxable_value?: number;
          cgst?: number;
          sgst?: number;
          igst?: number;
          total_amount?: number;
          source: 'books' | 'gstr_2b';
          period_month: number;
          period_year: number;
          recon_status?: string | null;
          status?: string | null;
          ai_explanation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          firm_id?: string;
          client_id?: string;
          document_id?: string | null;
          invoice_number?: string;
          supplier_gstin?: string;
          supplier_name?: string | null;
          invoice_date?: string;
          taxable_value?: number;
          cgst?: number;
          sgst?: number;
          igst?: number;
          total_amount?: number;
          source?: 'books' | 'gstr_2b';
          period_month?: number;
          period_year?: number;
          recon_status?: string | null;
          status?: string | null;
          ai_explanation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];
