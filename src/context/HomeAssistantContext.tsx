'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HomeAssistantClient, HAConfig } from '@/lib/homeassistant';
import { subscribeHaEvents, ConnectionStatus } from '@/lib/homeassistant/events';

export type HaStatus = ConnectionStatus | 'demo';

interface HomeAssistantContextType {
  client: HomeAssistantClient;
  isMock: boolean;
  configured: boolean;
  ready: boolean;
  status: HaStatus;
  source: 'file' | 'env' | null;
  /** Re-reads /api/ha/config after credentials change in Settings. */
  refreshConfig: () => Promise<void>;
}

const HomeAssistantContext = createContext<HomeAssistantContextType | undefined>(undefined);

const DEFAULT_CONFIG: HAConfig = { useMock: true, configured: false, source: null };

export function HomeAssistantProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<HAConfig | null>(null);
  const [status, setStatus] = useState<HaStatus>('connecting');
  const [reloadToken, setReloadToken] = useState(0);
  const queryClient = useQueryClient();

  // Config comes from the server; booleans + source only, never credentials.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/ha/config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : DEFAULT_CONFIG))
      .then((data: HAConfig) => {
        if (!cancelled) {
          setConfig({
            useMock: !!data.useMock,
            configured: !!data.configured,
            source: data.source ?? null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setConfig(DEFAULT_CONFIG);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refreshConfig = useCallback(async () => {
    // Drop cached data so demo and live data can never mix.
    queryClient.removeQueries({ queryKey: ['ha-states'] });
    queryClient.removeQueries({ queryKey: ['ha-calendar'] });
    queryClient.removeQueries({ queryKey: ['ha-todos'] });
    setStatus('connecting');
    setConfig(null);
    setReloadToken((t) => t + 1);
  }, [queryClient]);

  const effective = config ?? DEFAULT_CONFIG;
  const client = useMemo(() => new HomeAssistantClient(effective), [effective]);

  // Live updates: subscribe to the SSE bridge; every state change
  // invalidates the shared entity query so all derived data refreshes.
  useEffect(() => {
    if (!config || config.useMock) return;
    const handle = subscribeHaEvents(
      (event) => {
        if (event.type === 'state_changed') {
          queryClient.invalidateQueries({ queryKey: ['ha-states'] });
        }
      },
      (streamStatus) => setStatus(streamStatus)
    );
    return () => handle.close();
  }, [config, queryClient]);

  const value = useMemo<HomeAssistantContextType>(() => {
    const isMock = effective.useMock;
    return {
      client,
      isMock,
      configured: effective.configured,
      ready: config !== null,
      status: isMock ? 'demo' : status,
      source: effective.source ?? null,
      refreshConfig,
    };
  }, [client, effective, config, status, refreshConfig]);

  return <HomeAssistantContext.Provider value={value}>{children}</HomeAssistantContext.Provider>;
}

export function useHomeAssistant(): HomeAssistantContextType {
  const context = useContext(HomeAssistantContext);
  if (context === undefined) {
    throw new Error('useHomeAssistant must be used within a HomeAssistantProvider');
  }
  return context;
}
