import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, Users } from "lucide-react";
import { api } from "@/services/api";
import { useFilters } from "@/hooks/useFilters";
import { PageHeading, SectionHeading } from "@/components/cards/Shared";
import { InsightCard } from "@/components/cards/InsightCard";
import { QueryState, EmptyState } from "@/components/states/States";
import { InsightSkeleton } from "@/components/skeletons";
import { humanize, number } from "@/utils/data";
export default function Insights() {
  const { filters } = useFilters();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["insights", filters],
    queryFn: ({ signal }) => api.insights(filters, signal),
  });
  return (
    <>
      <PageHeading
        eyebrow="Cohort insights"
        title="Insights"
        description="Explore observed patterns, comparisons, and trends in student success, readiness, and engagement."
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
          const activeCategory = categories.includes(selectedCategory ?? "")
            ? selectedCategory
            : null;
          return (
            <>
              <div className="insight-context">
                <span>
                  <Users size={15} aria-hidden="true" />
                  {number(data.population_size, 0)} students in this cohort
                </span>
                <span>
                  <CalendarClock size={15} aria-hidden="true" />
                  Generated{" "}
                  {new Date(data.generated_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              {categories.length > 1 && (
                <div
                  className="insight-filters"
                  role="group"
                  aria-label="Filter insights by category"
                >
                  <button
                    type="button"
                    aria-pressed={activeCategory === null}
                    onClick={() => setSelectedCategory(null)}
                  >
                    All insights <span>{data.insights.length}</span>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={activeCategory === category}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {humanize(category.toLowerCase())}
                    </button>
                  ))}
                </div>
              )}
              {data.insights.length ? (
                <div className="insight-groups">
                  {categories
                    .filter(
                      (category) =>
                        activeCategory === null || category === activeCategory,
                    )
                    .map((category) => (
                      <section className="insight-group" key={category}>
                        <SectionHeading
                          title={humanize(category.toLowerCase())}
                          description="Observed patterns in your cohort"
                        />
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
                    ))}
                </div>
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
