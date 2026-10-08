import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudentProfile from "@/pages/StudentProfile";
import Insights from "@/pages/Insights";
import {
  HistoricalChart,
  RiskDistribution,
  SuccessDistribution,
} from "@/components/charts/Charts";
import { ExplanationPanels } from "@/pages/StudentProfile/ExplanationPanels";
import {
  KPISkeleton,
  ChartSkeleton,
  TableSkeleton,
  ProfileSkeleton,
  InsightSkeleton,
  SegmentSkeleton,
  PageSkeleton,
} from "@/components/skeletons";
import type { Explanation } from "@/types/api";
function wrap(children: React.ReactNode, url = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    </QueryClientProvider>,
  );
}
afterEach(() => vi.unstubAllGlobals());
describe("missing and insufficient data", () => {
  it("does not draw a historical line for one available period", () => {
    wrap(
      <HistoricalChart
        data={{
          success_score_trends: { "Sem-1": 60 },
          attendance_trends: {},
          engagement_trends: {},
        }}
      />,
    );
    expect(screen.getByText("Not enough historical data")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("does not turn an unavailable risk distribution into zero high risk", () => {
    wrap(<RiskDistribution title="Academic Risk" distribution={{}} />);
    expect(
      screen.getByText("No risk assessments available"),
    ).toBeInTheDocument();
    expect(screen.queryByText("HIGH")).not.toBeInTheDocument();
  });
  it("renders a zero-population success empty state instead of a fabricated score", () => {
    wrap(<SuccessDistribution distribution={{}} average={null} />);
    expect(
      screen.getByText("No score distribution available"),
    ).toBeInTheDocument();
  });
  it("does not fetch dependent assessments when a student does not exist", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    wrap(
      <Routes>
        <Route path="/students/:studentId" element={<StudentProfile />} />
      </Routes>,
      "/students/absent",
    );
    expect(await screen.findByText("Student not found.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("shows an empty insight feed for a real empty response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              population_size: 0,
              generated_at: "2026-10-08T09:00:00Z",
              applied_filters: {},
              insights: [],
            }),
            { status: 200 },
          ),
        ),
    );
    wrap(<Insights />);
    expect(
      await screen.findByText(
        "No significant insights available for this cohort.",
      ),
    ).toBeInTheDocument();
  });
});
describe("explainability presentation", () => {
  it("preserves backend weights, exclusions, and missing signals", () => {
    const risk = {
      score: 40,
      risk_level: "MEDIUM",
      drivers: [],
      protective_indicators: [],
      missing_signals: ["subject_performance"],
    };
    const explanation: Explanation = {
      student_id: "test",
      success_score: {
        score: 80,
        band: "Good",
        missing_domains: ["lms"],
        contributors: [
          {
            name: "academic",
            status: "available",
            excluded_from_calculation: false,
            configured_weight: 0.25,
            effective_weight: 0.5,
            normalized_value: 80,
            contribution: 40,
            direction: "positive",
          },
          {
            name: "lms",
            status: "missing",
            excluded_from_calculation: true,
            configured_weight: 0.15,
            effective_weight: 0,
            normalized_value: null,
            contribution: null,
            direction: "neutral",
          },
        ],
      },
      academic_risk: { ...risk, assessment_period: null },
      placement_risk: {
        ...risk,
        assessment_metadata: {
          placement_assessment_date: null,
          skills_assessment_date: null,
        },
      },
    };
    wrap(<ExplanationPanels explanation={explanation} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Excluded")).toBeInTheDocument();
    expect(screen.getAllByText("Subject Performance")).toHaveLength(2);
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
  });
});
describe("accessible loading states", () => {
  it.each([
    ["metric", KPISkeleton],
    ["chart", ChartSkeleton],
    ["students", TableSkeleton],
    ["student profile", ProfileSkeleton],
    ["insights", InsightSkeleton],
    ["segment", SegmentSkeleton],
    ["page", PageSkeleton],
  ] as const)(
    "provides a named status and geometry for %s",
    (name, Component) => {
      render(<Component />);
      expect(
        screen.getByRole("status", { name: `Loading ${name}` }),
      ).toHaveAttribute("aria-busy", "true");
    },
  );
});
