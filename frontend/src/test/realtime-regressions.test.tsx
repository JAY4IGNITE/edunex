import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

function setup(base?: string) {
  if (base) vi.stubEnv("VITE_API_BASE_URL", base);
  const sockets: { url: string; onmessage?: (event: { data: string }) => void; onclose?: () => void; close: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal("WebSocket", class {
    close = vi.fn();
    constructor(public url: string) { sockets.push(this); }
  });
  const client = new QueryClient();
  client.setQueryData(["segment", "high-academic"], { student_count: 2 });
  const result = renderHook(useRealtimeUpdates, { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
  return { sockets, client, ...result };
}

it("normalizes the configured API base before opening a WebSocket", () => {
  const { sockets } = setup("https://campus.example/");
  expect(sockets[0].url).toBe("wss://campus.example/ws/updates");
});

it("invalidates an open segment detail when analytics change", () => {
  const { sockets, client } = setup();
  act(() => sockets[0].onmessage?.({ data: JSON.stringify({ event_type: "analytics_updated" }) }));
  expect(client.getQueryState(["segment", "high-academic"])?.isInvalidated).toBe(true);
});

it("reconnects after a disconnect and cancels retries when unmounted", () => {
  vi.useFakeTimers();
  const { sockets, unmount } = setup();
  act(() => sockets[0].onclose?.());
  act(() => vi.advanceTimersByTime(1000));
  expect(sockets).toHaveLength(2);
  act(() => sockets[1].onclose?.());
  unmount();
  act(() => vi.advanceTimersByTime(60000));
  expect(sockets).toHaveLength(2);
  expect(sockets[1].close).toHaveBeenCalled();
});
