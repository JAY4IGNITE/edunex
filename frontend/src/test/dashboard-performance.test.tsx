import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import Dashboard from "@/pages/Dashboard";

afterEach(() => vi.unstubAllGlobals());

it("starts independent analytics together and uses overview distributions", async () => {
  const pending: Record<string, (response: Response) => void> = {};
  const fetcher = vi.fn((url: string) => new Promise<Response>(resolve => {
    pending[url.split("?")[0]] = resolve;
  }));
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><Dashboard /></MemoryRouter></QueryClientProvider>);
  await waitFor(() => expect(Object.keys(pending).sort()).toEqual([
    "/api/analytics/overview", "/api/analytics/trends", "/api/insights",
  ]));
  pending["/api/analytics/overview"](new Response(JSON.stringify({
    total_students: 12, average_success_score: 80, average_attendance: 90,
    average_engagement_index: 5, applied_filters: {},
    success_score_distribution: {}, academic_risk_distribution: {},
    placement_risk_distribution: {}, segment_distribution: {},
  })));
  expect(await screen.findByText("Average across assessed students")).toBeInTheDocument();
  // An independent failure must not blank the KPI section or wait for insights.
  pending["/api/analytics/trends"](new Response("{}", { status: 503 }));
  expect(await screen.findByText("Unable to load historical performance.")).toBeInTheDocument();
  expect(screen.getByText("Average across assessed students")).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(3);
  client.clear();
});
