import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AIPredictionPanel } from "../pages/StudentProfile/AIPredictionPanel";
import { api } from "../services/api";

vi.mock("../services/api", () => ({
  api: {
    aiPrediction: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <MemoryRouter><QueryClientProvider client={queryClient}>{ui}</QueryClientProvider></MemoryRouter>
  );
}

describe("AIPredictionPanel", () => {
  it("renders zero probability as a valid prediction", async () => {
    vi.mocked(api.aiPrediction).mockResolvedValueOnce({status:"success",risk_probability:0,prediction:"Low Risk"});
    renderWithClient(<AIPredictionPanel studentId="STU0001" />);
    expect(await screen.findByText("0.00%")).toBeInTheDocument();
  });
  it("labels the fallback as a score rather than a probability", async () => {
    vi.mocked(api.aiPrediction).mockResolvedValueOnce({status:"fallback",risk_score:42,risk_level:"MEDIUM",reason:"Trained model unavailable"});
    renderWithClient(<AIPredictionPanel studentId="STU0001" />);
    expect(await screen.findByText("Transparent baseline fallback")).toBeInTheDocument();
    expect(screen.getByText(/42.00\/100/)).toBeInTheDocument();
    expect(screen.queryByText("42.00%")).not.toBeInTheDocument();
  });
  it("renders loading skeleton initially", () => {
    vi.mocked(api.aiPrediction).mockImplementation(() => new Promise(() => {}));
    
    const { container } = renderWithClient(<AIPredictionPanel studentId="STU001" />);
    // Our ChartSkeleton should be rendered (indicated by empty-state or skeleton class)
    expect(container.querySelector(".skeleton") || container.querySelector("[aria-busy=\"true\"]")).not.toBeNull();
  });

  it("renders AI prediction data correctly", async () => {
    vi.mocked(api.aiPrediction).mockResolvedValueOnce({
      status: "success",
      student_id: "STU001",
      prediction: "Elevated Risk",
      prediction_horizon: "next_semester",
      risk_probability: 0.7845,
      model_version: "1.0.0",
      top_factors: {
        expected_value: 0.1,
        all_contributions: [],
        top_higher_risk: [
          { feature: "CGPA", value: 5.5, contribution: 1.3269, direction: "higher_risk" }
        ],
        top_lower_risk: [
          { feature: "Attendance", value: 85, contribution: -0.2354, direction: "lower_risk" }
        ]
      }
    });

    renderWithClient(<AIPredictionPanel studentId="STU001" />);

    await waitFor(() => {
      expect(screen.getByText("Synthetic prediction model")).toBeInTheDocument();
    });

    // Probability renders correctly (78.45%)
    expect(screen.getByText("78.45%")).toBeInTheDocument();
    // Elevated risk renders
    expect(screen.getByText("Elevated Risk")).toBeInTheDocument();
    // Model version renders
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
    // Horizon renders
    expect(screen.getByText("Next Semester")).toBeInTheDocument();

    // Higher-risk contributors render
    expect(screen.getByText("CGPA")).toBeInTheDocument();
    expect(screen.getByText("+1.3269")).toBeInTheDocument();

    // Lower-risk contributors render
    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByText("-0.2354")).toBeInTheDocument();
  });

  it("renders insufficient history state", async () => {
    vi.mocked(api.aiPrediction).mockResolvedValueOnce({
      status: "error",
      reason: "Additional semester history is required for this model."
    });

    renderWithClient(<AIPredictionPanel studentId="STU002" />);

    await waitFor(() => {
      expect(screen.getByText("AI early-warning prediction unavailable")).toBeInTheDocument();
      expect(screen.getByText("Additional semester history is required for this model.")).toBeInTheDocument();
    });
  });

  it("renders generic API error state", async () => {
    vi.mocked(api.aiPrediction).mockRejectedValueOnce(new Error("Network Error"));

    renderWithClient(<AIPredictionPanel studentId="STU003" />);

    await waitFor(() => {
      expect(screen.getByText("AI prediction temporarily unavailable.")).toBeInTheDocument();
    });
  });
});
