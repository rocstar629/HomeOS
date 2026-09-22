import { loadHaConfig } from '@/lib/homeassistant/server';

export const dynamic = 'force-dynamic';

/**
 * Server-Sent Events bridge to the Home Assistant WebSocket API.
 *
 * The access token lives only on the server: this route opens the HA
 * WebSocket, authenticates, subscribes to state_changed, and forwards
 * minimal event frames to the browser. If the HA connection drops, the
 * stream ends and the browser's EventSource reconnects, which creates a
 * fresh server-side connection (built-in reconnection behavior).
 */

interface StreamState {
  haSocket: WebSocket | null;
  closed: boolean;
}

function forward(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  state: StreamState,
  payload: unknown
): boolean {
  if (state.closed) return false;
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    return true;
  } catch {
    state.closed = true;
    return false;
  }
}

export async function GET() {
  const { config } = await loadHaConfig();
  if (!config) {
    return new Response('Home Assistant is not configured.', { status: 503 });
  }

  const encoder = new TextEncoder();
  const state: StreamState = { haSocket: null, closed: false };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        if (state.closed) return;
        state.closed = true;
        try {
          state.haSocket?.close();
        } catch {
          // Socket may already be closed.
        }
        state.haSocket = null;
        try {
          controller.close();
        } catch {
          // Controller may already be closed.
        }
      };

      let socket: WebSocket;
      try {
        const wsUrl = new URL(config.url);
        wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl.pathname = '/api/websocket';
        socket = new WebSocket(wsUrl.toString());
      } catch {
        cleanup();
        return;
      }

      state.haSocket = socket;
      let authed = false;
      const subscribeId = 7;

      socket.onmessage = (event) => {
        let message: { type?: string; event?: { event_type?: string; data?: Record<string, unknown> } };
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }

        if (message.type === 'auth_required') {
          socket.send(JSON.stringify({ type: 'auth', access_token: config.token }));
          return;
        }

        if (message.type === 'auth_ok') {
          authed = true;
          socket.send(
            JSON.stringify({ id: subscribeId, type: 'subscribe_events', event_type: 'state_changed' })
          );
          forward(controller, encoder, state, { type: 'connected' });
          return;
        }

        if (message.type === 'auth_invalid' || message.type === 'auth_failed') {
          // Auth failure will not resolve itself; end the stream.
          cleanup();
          return;
        }

        if (message.type === 'event' && message.event?.event_type === 'state_changed') {
          const data = message.event.data as
            | { entity_id?: string; new_state?: { state?: string } | null; old_state?: { state?: string } | null }
            | undefined;
          if (!data?.entity_id) return;

          const ok = forward(controller, encoder, state, {
            type: 'state_changed',
            entityId: data.entity_id,
            newState: data.new_state?.state ?? 'unknown',
            oldState: data.old_state?.state ?? 'unknown',
          });
          if (!ok) cleanup();
        }
      };

      socket.onerror = () => {
        // End the stream; the browser EventSource will retry.
        if (authed) cleanup();
        else cleanup();
      };

      socket.onclose = () => {
        cleanup();
      };

      // Detect client disconnect (browser navigated away / closed tab).
      const interval = setInterval(() => {
        if (state.closed) {
          clearInterval(interval);
          try {
            socket.close();
          } catch {
            // Already closed.
          }
        }
      }, 5000);

      // Safety: give up if HA never authenticates within 15s.
      setTimeout(() => {
        if (!authed && !state.closed) cleanup();
      }, 15_000);
    },
    cancel() {
      state.closed = true;
      try {
        state.haSocket?.close();
      } catch {
        // Already closed.
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
