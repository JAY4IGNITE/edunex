import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useFilters } from "@/hooks/useFilters";
import { PageHeading, SectionHeading } from "@/components/cards/Shared";
import { InsightCard } from "@/components/cards/InsightCard";
import { QueryState, EmptyState } from "@/components/states/States";
import { InsightSkeleton } from "@/components/skeletons";
import { number } from "@/utils/data";
export default function Insights() {
  const { filters } = useFilters();
  const query = useQuery({
    queryKey: ["insights", filters],
    queryFn: ({ signal }) => api.insights(filters, signal),
  });
  return (
    <>
      <PageHeading
        eyebrow="Cohort insights"
        title="From signals to understanding."
        description="A considered view of student success, readiness, and engagement. Every insight comes from the backend analysis."
      />
      <QueryState
        query={query}
        message="Unable to load insights."
        skeleton={
          <div className="grid-two">
            {[1, 2, 3, 4].map((n) => (
              <InsightSkeleton key={n} />
            ))}
          </div>
        }
      >
        {(data) => {
          const categories = [
            ...new Set(data.insights.map((insight) => insight.category)),
          ];
          return (
            <>
              <div className="scope-note">
                {number(data.population_size, 0)} students in this cohort ·
                Generated{" "}
                {new Date(data.generated_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
              {data.insights.length ? (
                categories.map((category) => (
                  <section className="insight-group" key={category}>
                    <SectionHeading title={category} />
                    <div className="grid-two">
                      {data.insights
                        .filter((insight) => insight.category === category)
                        .map((insight) => (
                          <InsightCard
                            key={insight.insight_id}
                            insight={insight}
                          />
                        ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="panel">
                  <EmptyState
                    title="No significant insights available for this cohort."
                    description="Choose a broader cohort with sufficient available measurements."
                  />
                </div>
              )}
            </>
          );
        }}
      </QueryState>
    </>
  );
}
