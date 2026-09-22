/**
 * Live Home Assistant events over Server-Sent Events.
 *
 * The browser opens an EventSource to /api/ha/events. The Next.js server
 * holds the actual Home Assistant WebSocket connection (with the access
 * token) and forwards state_changed events. EventSource reconnects
 * automatically; we surface connection state so the UI can show an
 * unobtrusive "offline" indicator.
 */
export type HaEvent =
  | { type: 'state_changed'; entityId: string; newState: string; oldState: string }
  | { type: 'connected' };

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

export interface EventStreamHandle {
  close: () => void;
}

export function subscribeHaEvents(
  onEvent: (event: HaEvent) => void,
  onStatus: (status: ConnectionStatus) => void
): EventStreamHandle {
  const source = new EventSource('/api/ha/events');
  onStatus('connecting');

  source.onopen = () => onStatus('online');

  source.onmessage = (message) => {
    try {
      const data = JSON.parse(message.data) as HaEvent;
      onEvent(data);
      if (data.type === 'connected') onStatus('online');
    } catch {
      // Ignore malformed frames rather than tearing down the stream.
    }
  };

  source.onerror = () => {
    // EventSource retries on its own; report degraded state meanwhile.
    onStatus('offline');
  };

  return {
    close: () => source.close(),
  };
}
