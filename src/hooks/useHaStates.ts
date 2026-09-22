'use client';

import { useQuery } from '@tanstack/react-query';
import { useHomeAssistant } from '@/context/HomeAssistantContext';
import { HAEntity } from '@/lib/homeassistant/types';

/**
 * Single shared query for all Home Assistant entity states. Every derived
 * hook (people, devices, summary, weather, places) reads from this one
 * cache entry, so one SSE invalidation refreshes the whole app.
 */
export function useHaStates() {
  const { client, isMock, ready } = useHomeAssistant();

  return useQuery<HAEntity[]>({
    queryKey: ['ha-states'],
    queryFn: () => client.getEntities(),
    enabled: ready && !isMock,
  });
}
