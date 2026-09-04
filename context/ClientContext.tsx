'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface Client {
  id: string;
  name: string;
  gstin: string;
  firm_id?: string;
  pan?: string;
  created_at?: string;
  trade_name?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export type ClientProfile = Client;

export interface FirmProfile {
  id: string;
  name: string;
  role?: string;
}

export interface ClientContextType {
  // Primary user-specified contract
  currentClient: Client | null;
  setCurrentClient: (client: Client | null) => void;
  clients: Client[];
  loading: boolean;

  // Additional persistence & compatibility fields
  selectedClient: Client | null;
  selectedClientId: string | null;
  isLoading: boolean;
  error: string | null;
  setSelectedClientId: (id: string | null) => void;
  setSelectedClient: (client: Client | null) => void;
  refreshClients: () => Promise<void>;

  // Multi-Firm support
  selectedFirmId: string;
  firmName: string;
  firms: FirmProfile[];
  setSelectedFirmId: (firmId: string) => void;
  refreshFirms: () => Promise<void>;

  // Helper getters
  getClientById: (id: string) => Client | undefined;
}

// Initial mock clients as specified, with production-ready default records
export const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'c1',
    firm_id: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
    name: 'Acme Corp Industries',
    gstin: '29AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    trade_name: 'Acme Corp Heavy Industries',
    status: 'active',
  },
  {
    id: 'c2',
    firm_id: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
    name: 'Beta Tech Solutions',
    gstin: '29BBBBB1111B1Z6',
    pan: 'BBBBB1111B',
    trade_name: 'Beta Cloud Technologies',
    status: 'active',
  },
  {
    id: '7ed6ea05-df68-49a4-bfa4-aeaba84d29ca',
    firm_id: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
    name: 'Acme Manufacturing Ltd.',
    gstin: '27AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    trade_name: 'Acme Heavy Industries',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    firm_id: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
    name: 'Horizon Logistics LLP',
    gstin: '19BBBBB1111B2Z6',
    pan: 'BBBBB1111B',
    trade_name: 'Horizon Freight & Supply',
    status: 'active',
  },
];

export const DEFAULT_FIRMS: FirmProfile[] = [
  {
    id: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
    name: 'Kapur & Associates, CAs',
    role: 'Managing Partner',
  },
  {
    id: 'f1000000-0000-0000-0000-000000000002',
    name: 'Kapur Tax Advisory & Corp Services',
    role: 'Senior Partner',
  },
];

const STORAGE_KEY_CLIENT = 'gst_compliance_active_client_id';
const STORAGE_KEY_FIRM = 'gst_compliance_active_firm_id';

const ClientContext = createContext<ClientContextType>({
  currentClient: null,
  setCurrentClient: () => {},
  clients: [],
  loading: true,
  selectedClient: null,
  selectedClientId: null,
  isLoading: true,
  error: null,
  setSelectedClientId: () => {},
  setSelectedClient: () => {},
  refreshClients: async () => {},
  selectedFirmId: 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
  firmName: 'Kapur & Associates, CAs',
  firms: DEFAULT_FIRMS,
  setSelectedFirmId: () => {},
  refreshFirms: async () => {},
  getClientById: () => undefined,
});

export interface ClientProviderProps {
  children: React.ReactNode;
  initialFirmId?: string;
  initialFirmName?: string;
  initialClients?: Client[];
  initialClientId?: string;
}

export const ClientProvider = ({
  children,
  initialFirmId = 'a763af2b-c7ea-4a56-b448-513df5ca0dfa',
  initialFirmName = 'Kapur & Associates, CAs',
  initialClients,
  initialClientId,
}: ClientProviderProps) => {
  const [selectedFirmId, setSelectedFirmIdState] = useState<string>(initialFirmId);
  const [firmName, setFirmName] = useState<string>(initialFirmName);
  const [firms, setFirms] = useState<FirmProfile[]>(DEFAULT_FIRMS);
  const [clients, setClients] = useState<Client[]>(initialClients || DEFAULT_CLIENTS);
  const [currentClient, setCurrentClientState] = useState<Client | null>(
    (initialClients && initialClients[0]) || DEFAULT_CLIENTS[0]
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Set current client with local storage persistence
  const setCurrentClient = useCallback((client: Client | null) => {
    setCurrentClientState(client);
    if (typeof window !== 'undefined') {
      try {
        if (client?.id) {
          localStorage.setItem(STORAGE_KEY_CLIENT, client.id);
        } else {
          localStorage.removeItem(STORAGE_KEY_CLIENT);
        }
      } catch (e) {
        console.warn('Could not persist client selection to localStorage:', e);
      }
    }
  }, []);

  const setSelectedClientId = useCallback(
    (id: string | null) => {
      if (!id) {
        setCurrentClient(null);
      } else {
        const found = clients.find((c) => c.id === id);
        if (found) {
          setCurrentClient(found);
        } else {
          setCurrentClient({ id, name: `Client (${id.substring(0, 8)})`, gstin: '27AAAAA0000A1Z5' });
        }
      }
    },
    [clients, setCurrentClient]
  );

  const setSelectedClient = setCurrentClient;

  // Set selected firm with persistence
  const setSelectedFirmId = useCallback(
    (firmId: string) => {
      setSelectedFirmIdState(firmId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY_FIRM, firmId);
        } catch (e) {
          console.warn('Could not persist firm selection to localStorage:', e);
        }
      }
      const matchedFirm = firms.find((f) => f.id === firmId);
      if (matchedFirm) {
        setFirmName(matchedFirm.name);
      }
    },
    [firms]
  );

  // Fetch or refresh clients from Supabase, falling back to mock clients
  const refreshClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('id, firm_id, name, gstin, pan, created_at')
        .eq('firm_id', selectedFirmId)
        .order('created_at', { ascending: false });

      if (fetchError || !data || data.length === 0) {
        // Fallback to default mock clients
        setClients(DEFAULT_CLIENTS);
        setCurrentClientState((prev) => {
          if (prev && DEFAULT_CLIENTS.some((c) => c.id === prev.id)) return prev;
          return DEFAULT_CLIENTS[0];
        });
      } else {
        const mappedClients: Client[] = data.map((c) => ({
          id: c.id,
          firm_id: c.firm_id || selectedFirmId,
          name: c.name,
          gstin: c.gstin,
          pan: c.pan || (c.gstin ? c.gstin.substring(2, 12) : ''),
          created_at: c.created_at,
          status: 'active',
        }));
        setClients(mappedClients);
        setCurrentClientState((prev) => {
          if (prev && mappedClients.some((c) => c.id === prev.id)) {
            return prev;
          }
          return mappedClients[0];
        });
      }
    } catch (err: any) {
      console.warn('Client refresh notice:', err?.message);
      setClients(DEFAULT_CLIENTS);
    } finally {
      setLoading(false);
    }
  }, [selectedFirmId]);

  // Refresh firms from Supabase
  const refreshFirms = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: userResp } = await supabase.auth.getUser();
      if (!userResp?.user) return;

      const { data: userFirms, error: firmError } = await supabase
        .from('firm_users')
        .select('firm_id, role, firms(id, name)')
        .eq('user_id', userResp.user.id);

      if (!firmError && userFirms && userFirms.length > 0) {
        const loadedFirms: FirmProfile[] = userFirms.map((item: any) => ({
          id: item.firm_id,
          name: item.firms?.name || 'CA Practice',
          role: item.role || 'Member',
        }));
        setFirms(loadedFirms);
        const currentActive = loadedFirms.find((f) => f.id === selectedFirmId);
        if (currentActive) {
          setFirmName(currentActive.name);
        }
      }
    } catch (err: any) {
      console.warn('Notice refreshing firms:', err?.message);
    }
  }, [selectedFirmId]);

  // Initial client-side hydration from localStorage & fetching
  useEffect(() => {
    let savedClientId: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const savedFirmId = localStorage.getItem(STORAGE_KEY_FIRM);
        if (savedFirmId) setSelectedFirmIdState(savedFirmId);

        savedClientId = localStorage.getItem(STORAGE_KEY_CLIENT);
      } catch (e) {
        console.warn('Error reading from localStorage:', e);
      }
    }

    async function initialize() {
      await refreshClients();
      if (savedClientId) {
        setSelectedClientId(savedClientId);
      }
      setLoading(false);
    }

    initialize();
    refreshFirms();
  }, [refreshClients, refreshFirms, setSelectedClientId]);

  const getClientById = useCallback(
    (id: string) => clients.find((c) => c.id === id),
    [clients]
  );

  const value = useMemo(
    () => ({
      currentClient,
      setCurrentClient,
      clients,
      loading,
      selectedClient: currentClient,
      selectedClientId: currentClient?.id || null,
      isLoading: loading,
      error,
      setSelectedClientId,
      setSelectedClient,
      refreshClients,
      selectedFirmId,
      firmName,
      firms,
      setSelectedFirmId,
      refreshFirms,
      getClientById,
    }),
    [
      currentClient,
      setCurrentClient,
      clients,
      loading,
      error,
      setSelectedClientId,
      setSelectedClient,
      refreshClients,
      selectedFirmId,
      firmName,
      firms,
      setSelectedFirmId,
      refreshFirms,
      getClientById,
    ]
  );

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
};

export const useClient = () => useContext(ClientContext);
