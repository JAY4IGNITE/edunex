import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { InterventionCard } from "@/components/interventions/InterventionCard";
import { supportApi, type Intervention } from "@/services/api/support";

vi.mock("@/services/api/support", () => ({supportApi: {update: vi.fn(), audit: vi.fn()}}));
const record: Intervention = {
  id: 7, student_id: "TEST01", recommendation_key: "mentor-check-in", status: "Recommended",
  assignee: null, due_date: null, notes: "", dismissal_reason: null, version: 1,
  created_at: "2026-10-09T00:00:00Z", completed_at: null, outcome: null,
  recommendation: {key: "mentor-check-in", risk_type: "academic", action: "Schedule a mentor check-in",
    rationale: "Attendance needs support.", evidence: {overall_attendance: 61}, driver_keys: ["academic:attendance"],
    owner_role: "Mentor", urgency: "High", suggested_days: 7, expected_impact: "Support needs are reviewed by staff."},
};
function show(value = record) {
  const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
  return render(<MemoryRouter><QueryClientProvider client={client}><InterventionCard record={value} /></QueryClientProvider></MemoryRouter>);
}
describe("Human-reviewed intervention actions", () => {
  it("requires a dismissal reason and sends the current version", async () => {
    vi.mocked(supportApi.update).mockResolvedValue({...record,status:"Dismissed",version:2});
    show();
    expect(screen.getByRole("button",{name:"Dismiss"})).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Reason for dismissal"),"Support already arranged");
    await userEvent.click(screen.getByRole("button",{name:"Dismiss"}));
    await waitFor(()=>expect(supportApi.update).toHaveBeenCalledWith(7,{version:1,status:"Dismissed",notes:"",dismissal_reason:"Support already arranged"}));
  });
  it("does not claim improvement or offer actions after completion", () => {
    show({...record,status:"Completed",outcome:{follow_up_available:false,score_change:null,note:"No later assessment recorded; outcome unavailable."}});
    expect(screen.getByRole("status")).toHaveTextContent("outcome unavailable");
    expect(screen.queryByRole("button",{name:"Complete"})).not.toBeInTheDocument();
    expect(screen.queryByText(/Score change:/)).not.toBeInTheDocument();
  });
  it("keeps server validation failures visible", async () => {
    vi.mocked(supportApi.update).mockRejectedValue(new Error("This intervention changed. Refresh and try again."));
    show({...record,status:"Assigned",assignee:"mentor-demo",due_date:"2026-10-15"});
    await userEvent.click(screen.getByRole("button",{name:"Start"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Refresh and try again");
  });
});
