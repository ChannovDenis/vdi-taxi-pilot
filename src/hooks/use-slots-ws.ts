import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface WsEvent {
  event: string;
  slot_id?: string;
  occupant_name?: string;
  next_in_queue?: string;
}

const WS_URL =
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
  window.location.host +
  "/api/ws/slots";

const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 30000;

/**
 * WebSocket hook for real-time slot status updates.
 * Invalidates react-query "slots" cache on events.
 * Falls back to polling (handled by useQuery refetchInterval).
 */
export function useSlotsWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const pingTimer = useRef<ReturnType<typeof setInterval>>();
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Start heartbeat
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, PING_INTERVAL);
      };

      ws.onmessage = (evt) => {
        if (evt.data === "pong") return;

        try {
          const data: WsEvent = JSON.parse(evt.data);

          if (
            data.event === "slot_occupied" ||
            data.event === "slot_released" ||
            data.event === "queue_changed"
          ) {
            // Invalidate slots query to trigger refetch
            queryClient.invalidateQueries({ queryKey: ["slots"] });
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        if (pingTimer.current) clearInterval(pingTimer.current);
        // Reconnect after delay
        if (mountedRef.current) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available — polling fallback is active
      if (mountedRef.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      }
    }
  }, [queryClient]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
