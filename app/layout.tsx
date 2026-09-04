import React from 'react';
import type { Metadata } from 'next';
import '@/src/index.css';
import { ClientProvider } from '@/context/ClientContext';

export const metadata: Metadata = {
  title: 'GST Compliance OS | CA Firm Management & Reconciliation',
  description: 'Multi-tenant workflow OS for CA firms to manage clients, extract document data, and run deterministic GST reconciliations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="min-h-full font-sans antialiased text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}
