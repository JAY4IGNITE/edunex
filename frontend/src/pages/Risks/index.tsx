import { useQuery } from "@tanstack/react-query";
import { PageHeading } from "@/components/cards/Shared";
import { StudentTable } from "@/components/tables/StudentTable";
import { QueryState } from "@/components/states/States";
import { ChartSkeleton } from "@/components/skeletons";
import { RiskDistribution } from "@/components/charts/Charts";
import { useFilters } from "@/hooks/useFilters";
import { api } from "@/services/api";
import { ShieldCheck } from "lucide-react";
export default function Risks() {
  const { filters } = useFilters();
  const query = useQuery({
    queryKey: ["distribution", filters],
    queryFn: ({ signal }) => api.distribution(filters, signal),
  });
  return (
    <>
      <PageHeading
        eyebrow="Risk intelligence"
        title="See where attention matters."
        description="Academic and placement risk, with the context needed for a considered review."
      />
      <QueryState
        query={query}
        skeleton={
          <div className="grid-two">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        }
        message="Unable to load risk distributions."
      >
        {(data) => (
          <div className="grid-two">
            <RiskDistribution
              title="Academic Risk"
              distribution={data.academic_risk_distribution}
            />
            <RiskDistribution
              title="Placement Risk"
              distribution={data.placement_risk_distribution}
            />
          </div>
        )}
      </QueryState>
      <div className="scope-note risk-context-note">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>
          Risk levels are backend assessments of available signals. Review the
          Student 360 explanation before drawing conclusions about an
          individual.
        </p>
      </div>
      <StudentTable highRisk />
    </>
  );
}
