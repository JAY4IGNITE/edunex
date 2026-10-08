import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type ConnectionStatus = "connected" | "reconnecting" | "offline";

export function useRealtimeUpdates(): ConnectionStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>("offline");
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);
  const backoff = useRef(1000); // Start with 1 second

  useEffect(() => {
    let active = true;

    function connect() {
      if (!active) return;
      
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/+$/, "");
      const wsUrl = baseUrl.replace(/^http/, 'ws') + "/ws/updates";

      try {
        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => {
          if (!active) return;
          setStatus("connected");
          backoff.current = 1000; // Reset backoff on successful connect
        };

        socket.onmessage = (event) => {
          if (!active) return;
          try {
            const data = JSON.parse(event.data);
            handleEvent(data);
          } catch (e) {
            // Ignore malformed events
          }
        };

        socket.onclose = () => {
          if (!active) return;
          setStatus("reconnecting");
          scheduleReconnect();
        };

        socket.onerror = () => {
          // Error handler is required, but close will also fire and handle reconnect
        };
      } catch (e) {
        if (!active) return;
        setStatus("reconnecting");
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      if (reconnectTimeout.current !== null) {
        window.clearTimeout(reconnectTimeout.current);
      }
      reconnectTimeout.current = window.setTimeout(() => {
        if (active) connect();
      }, backoff.current);

      // Exponential backoff with jitter up to ~30s
      backoff.current = Math.min(30000, backoff.current * 2) + (Math.random() * 500);
    }

    function handleEvent(data: unknown) {
      if (!data || typeof data !== "object") return;

      const { event_type, student_id } = data as Record<string, unknown>;

      if (event_type === "analytics_updated") {
        queryClient.invalidateQueries({ queryKey: ["overview"] });
        queryClient.invalidateQueries({ queryKey: ["trends"] });
        queryClient.invalidateQueries({ queryKey: ["distribution"] });
        queryClient.invalidateQueries({ queryKey: ["segments"] });
        queryClient.invalidateQueries({ queryKey: ["segment"] });
        queryClient.invalidateQueries({ queryKey: ["insights"] });
        // NOTE: we intentionally don't invalidate "students" list blindly to avoid request storms
      } else if (event_type === "student_updated" && typeof student_id === "string" && student_id) {
        // Invalidate specific student queries
        queryClient.invalidateQueries({ queryKey: ["student", student_id] });
        queryClient.invalidateQueries({ queryKey: ["score", student_id] });
        queryClient.invalidateQueries({ queryKey: ["academic-risk", student_id] });
        queryClient.invalidateQueries({ queryKey: ["placement-risk", student_id] });
        queryClient.invalidateQueries({ queryKey: ["explanation", student_id] });
        queryClient.invalidateQueries({ queryKey: ["membership", student_id] });
        
        // Also invalidate analytics because the student's metrics shifted the global averages
        queryClient.invalidateQueries({ queryKey: ["overview"] });
        queryClient.invalidateQueries({ queryKey: ["trends"] });
        queryClient.invalidateQueries({ queryKey: ["distribution"] });
        queryClient.invalidateQueries({ queryKey: ["segments"] });
        queryClient.invalidateQueries({ queryKey: ["segment"] });
        queryClient.invalidateQueries({ queryKey: ["insights"] });
      }
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimeout.current !== null) {
        window.clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [queryClient]);

  return status;
}
