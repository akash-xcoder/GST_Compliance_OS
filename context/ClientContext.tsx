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
  currentClient: Client | null;
  setCurrentClient: (client: Client | null) => void;
  clients: Client[];
  loading: boolean;

  // Additional persistence & compatibility fields
  selectedClient: Client | null;
  selectedClientId: string | null;
  activeClientId: string | null;
  isLoading: boolean;
  error: string | null;
  setSelectedClientId: (id: string | null) => void;
  setSelectedClient: (client: Client | null) => void;
  refreshClients: () => Promise<void>;

  // Multi-Firm support
  selectedFirmId: string;
  firmName: string;
  setFirmName: (name: string) => void;
  firms: FirmProfile[];
  setSelectedFirmId: (firmId: string) => void;
  refreshFirms: () => Promise<void>;

  // Helper getters
  getClientById: (id: string) => Client | undefined;
}

const STORAGE_KEY_CLIENT = 'gst_compliance_active_client_id';
const STORAGE_KEY_FIRM = 'gst_compliance_active_firm_id';

const ClientContext = createContext<ClientContextType>({
  currentClient: null,
  setCurrentClient: () => {},
  clients: [],
  loading: true,
  selectedClient: null,
  selectedClientId: null,
  activeClientId: null,
  isLoading: true,
  error: null,
  setSelectedClientId: () => {},
  setSelectedClient: () => {},
  refreshClients: async () => {},
  selectedFirmId: '',
  firmName: '',
  setFirmName: () => {},
  firms: [],
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
  initialFirmId = '',
  initialFirmName = '',
  initialClients,
  initialClientId,
}: ClientProviderProps) => {
  const [selectedFirmId, setSelectedFirmIdState] = useState<string>(initialFirmId);
  const [firmName, setFirmName] = useState<string>(initialFirmName);
  const [firms, setFirms] = useState<FirmProfile[]>([]);
  const [clients, setClients] = useState<Client[]>(initialClients || []);
  const [currentClient, setCurrentClientState] = useState<Client | null>(
    (initialClients && initialClients[0]) || null
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
          setCurrentClient(null);
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

  // Fetch live clients from Supabase based on firm membership and user ID
  const refreshClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // Query all clients accessible to this authenticated session via Supabase RLS
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('id, firm_id, name, gstin, pan, created_at, trade_name')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.warn('Notice querying Supabase clients:', fetchError.message);
        setClients([]);
        setCurrentClientState(null);
      } else if (!data || data.length === 0) {
        // True zero state: strictly show empty state if 0 records, never fallback to mock data
        setClients([]);
        setCurrentClientState(null);
      } else {
        // If selectedFirmId matches records in this tenant, scope to that firm, otherwise show all user records
        let activeClients = data;
        if (selectedFirmId) {
          const matched = data.filter((c: any) => c.firm_id === selectedFirmId);
          if (matched.length > 0) {
            activeClients = matched;
          }
        }

        const mappedClients: Client[] = activeClients.map((c: any) => ({
          id: c.id,
          firm_id: c.firm_id || selectedFirmId,
          name: c.name,
          gstin: c.gstin,
          pan: c.pan || (c.gstin ? c.gstin.substring(2, 12) : ''),
          trade_name: c.trade_name,
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
      console.warn('Client refresh error:', err?.message);
      setClients([]);
      setCurrentClientState(null);
      setError(err?.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [selectedFirmId]);

  // Refresh firms from Supabase firm_users join
  const refreshFirms = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return;

      const { data: userFirms, error: firmError } = await supabase
        .from('firm_users')
        .select('firm_id, role, firms(id, name)')
        .eq('user_id', user.id);

      if (!firmError && userFirms && userFirms.length > 0) {
        const loadedFirms: FirmProfile[] = userFirms.map((item: any) => ({
          id: item.firm_id,
          name: item.firms?.name || 'CA Practice Workspace',
          role: item.role || 'Member',
        }));
        setFirms(loadedFirms);

        if (!selectedFirmId || !loadedFirms.some((f) => f.id === selectedFirmId)) {
          setSelectedFirmIdState(loadedFirms[0].id);
          setFirmName(loadedFirms[0].name);
        } else {
          const currentActive = loadedFirms.find((f) => f.id === selectedFirmId);
          if (currentActive) {
            setFirmName(currentActive.name);
          }
        }
      }
    } catch (err: any) {
      console.warn('Notice refreshing firms:', err?.message);
    }
  }, [selectedFirmId]);

  // Initial client-side hydration from localStorage & fetching - runs strictly once on mount
  useEffect(() => {
    let isMounted = true;
    let savedClientId: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const savedFirmId = localStorage.getItem(STORAGE_KEY_FIRM);
        if (savedFirmId && !initialFirmId) {
          setSelectedFirmIdState(savedFirmId);
        }

        savedClientId = localStorage.getItem(STORAGE_KEY_CLIENT) || initialClientId || null;
      } catch (e) {
        console.warn('Error reading from localStorage:', e);
      }
    }

    async function initialize() {
      await refreshFirms();
      await refreshClients();
      if (isMounted) {
        if (savedClientId) {
          setSelectedClientId(savedClientId);
        }
        setLoading(false);
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, []); // Strictly empty dependency array to prevent infinite rendering loops

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
      activeClientId: currentClient?.id || null,
      isLoading: loading,
      error,
      setSelectedClientId,
      setSelectedClient,
      refreshClients,
      selectedFirmId,
      firmName,
      setFirmName,
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
      setFirmName,
      firms,
      setSelectedFirmId,
      refreshFirms,
      getClientById,
    ]
  );

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
};

export const useClient = () => useContext(ClientContext);
