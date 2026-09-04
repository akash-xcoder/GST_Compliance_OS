import React from 'react';
import { VendorCommunicationDashboard } from '@/components/vendor-communication/VendorCommunicationDashboard';

export const dynamic = 'force-dynamic';

export default function VendorCommunicationsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <VendorCommunicationDashboard />
    </div>
  );
}
