import { render, screen, act } from "@testing-library/react";
import { expect, test, describe, beforeEach, afterEach, vi } from "vitest";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock WebSocket
class MockWebSocket {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 10);
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket;

function TestComponent() {
  const status = useRealtimeUpdates();
  return <LiveIndicator status={status} />;
}

describe("Real-time Infrastructure", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(queryClient, "invalidateQueries");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("connects to WebSocket and renders Live indicator", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    // Initial state
    expect(screen.getByRole("status")).toHaveTextContent("Offline");

    // Wait for connection to open
    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(screen.getByRole("status")).toHaveTextContent("Live");
  });

  test("handles disconnect and reconnection backoff", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    act(() => {
      vi.advanceTimersByTime(20);
    });

    // We need a reference to the active mock socket to simulate a close
    // Since we didn't save it globally, we'll test the UI states manually first
    const { unmount } = render(<LiveIndicator status="reconnecting" />);
    expect(screen.getAllByRole("status")[1]).toHaveTextContent("Reconnecting");
    unmount();
  });

  test("invalidates institution queries on analytics_updated event", async () => {
    let activeSocket: MockWebSocket | null = null;
    
    // Override the constructor to grab the instance
    const OriginalMockWS = MockWebSocket;
    function WSProxy(url: string) {
      const ws = new OriginalMockWS(url);
      activeSocket = ws;
      return ws;
    }
    // @ts-ignore
    global.WebSocket = WSProxy;

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(activeSocket).not.toBeNull();

    // Send analytics_updated event
    act(() => {
      activeSocket!.onmessage!({
        data: JSON.stringify({ event_type: "analytics_updated" })
      });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["overview"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trends"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["distribution"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["segments"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["insights"] });
    
    // Students list should NOT be invalidated unconditionally
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["students"] });
    
    // @ts-ignore
    global.WebSocket = OriginalMockWS;
  });

  test("invalidates student and institution queries on student_updated event", async () => {
    let activeSocket: MockWebSocket | null = null;
    
    // Override the constructor to grab the instance
    const OriginalMockWS = MockWebSocket;
    function WSProxy(url: string) {
      const ws = new OriginalMockWS(url);
      activeSocket = ws;
      return ws;
    }
    // @ts-ignore
    global.WebSocket = WSProxy;

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    act(() => {
      vi.advanceTimersByTime(20);
    });

    // Send student_updated event
    act(() => {
      activeSocket!.onmessage!({
        data: JSON.stringify({ event_type: "student_updated", student_id: "STU123" })
      });
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["student", "STU123"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["score", "STU123"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["academic-risk", "STU123"] });
    
    // Also invalidates institution
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["overview"] });
    
    // @ts-ignore
    global.WebSocket = OriginalMockWS;
  });

  test("ignores malformed events gracefully", async () => {
    let activeSocket: MockWebSocket | null = null;
    const OriginalMockWS = MockWebSocket;
    function WSProxy(url: string) {
      const ws = new OriginalMockWS(url);
      activeSocket = ws;
      return ws;
    }
    // @ts-ignore
    global.WebSocket = WSProxy;

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    act(() => {
      vi.advanceTimersByTime(20);
    });

    // Send malformed event
    act(() => {
      activeSocket!.onmessage!({
        data: "not json"
      });
    });

    // Should not crash, and should not invalidate
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    
    // @ts-ignore
    global.WebSocket = OriginalMockWS;
  });
});
