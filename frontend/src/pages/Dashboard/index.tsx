import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  GraduationCap,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { useFilters } from "@/hooks/useFilters";
import { useEntrance } from "@/hooks/useMotion";
import { Metric, PageHeading, SectionHeading } from "@/components/cards/Shared";
import { QueryState, EmptyState } from "@/components/states/States";
import {
  KPISkeleton,
  ChartSkeleton,
  InsightSkeleton,
} from "@/components/skeletons";
import {
  HistoricalChart,
  RiskDistribution,
  SuccessDistribution,
} from "@/components/charts/Charts";
import { InsightCard } from "@/components/cards/InsightCard";
import { SpotlightCard } from "@/components/cards/SpotlightCard";
import { SegmentDistribution } from "@/components/charts/SegmentDistribution";
export default function Dashboard() {
  const { filters, cohortSearch } = useFilters();
  const overview = useQuery({
    queryKey: ["overview", filters],
    queryFn: ({ signal }) => api.overview(filters, signal),
  });
  const distribution = useQuery({
    queryKey: ["distribution", filters],
    queryFn: ({ signal }) => api.distribution(filters, signal),
    enabled: overview.isSuccess,
    placeholderData: overview.data,
  });
  const trends = useQuery({
    queryKey: ["trends", filters],
    queryFn: ({ signal }) => api.trends(filters, signal),
    enabled: overview.isSuccess && distribution.isFetched,
  });
  const insights = useQuery({
    queryKey: ["insights", filters],
    queryFn: ({ signal }) => api.insights(filters, signal),
    enabled: overview.isSuccess && trends.isFetched,
  });
  const ref = useEntrance(overview.data);
  return (
    <div ref={ref}>
      <PageHeading
        eyebrow="Campus overview"
        title="Student Success Intelligence"
        description="Understand performance, identify risk, and discover the student groups that need attention."
        action={
          <Link
            className="text-link heading-link"
            to={`/students${cohortSearch}`}
          >
            Explore students <ArrowRight size={16} />
          </Link>
        }
      />
      <QueryState
        query={overview}
        message="Unable to load analytics."
        skeleton={
          <div className="kpi-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <KPISkeleton key={i} />
            ))}
          </div>
        }
      >
        {(data) => (
          <>
            <div className="kpi-grid">
              <Metric
                label="Total Students"
                value={data.total_students}
                context="In the selected cohort"
                icon={<Users />}
              />
              <Metric
                label="Success Score"
                value={data.average_success_score}
                suffix="/100"
                context="Average across assessed students"
                icon={<GraduationCap />}
              />
              <Metric
                label="Attendance"
                value={data.average_attendance}
                suffix="%"
                context="Average recorded attendance"
                icon={<CalendarCheck />}
              />
              <Metric
                label="Engagement"
                value={data.average_engagement_index}
                context="Average engagement index"
                icon={<Activity />}
              />
            </div>
            {data.total_students === 0 && (
              <div className="panel">
                <EmptyState
                  title="No students match these filters."
                  description="Reset your filters or select a different cohort."
                />
              </div>
            )}
          </>
        )}
      </QueryState>
      {overview.isPending && (
        <>
          <div className="overview-middle">
            <ChartSkeleton />
            <div className="risk-stack">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </div>
          <ChartSkeleton />
          <div className="grid-three">
            {[1, 2, 3].map((n) => (
              <InsightSkeleton key={n} />
            ))}
          </div>
        </>
      )}
      {overview.isSuccess && (
        <>
          <div className="overview-middle">
            <QueryState
              query={distribution}
              message="Unable to load distributions."
              skeleton={<ChartSkeleton />}
            >
              {(data) => (
                <SuccessDistribution
                  distribution={data.success_score_distribution}
                  average={overview.data.average_success_score}
                />
              )}
            </QueryState>
            <div className="risk-stack">
              <QueryState
                query={distribution}
                message="Unable to load risk distributions."
                skeleton={<ChartSkeleton />}
              >
                {(data) => (
                  <>
                    <RiskDistribution
                      title="Academic Risk"
                      distribution={data.academic_risk_distribution}
                    />
                    <RiskDistribution
                      title="Placement Risk"
                      distribution={data.placement_risk_distribution}
                    />
                  </>
                )}
              </QueryState>
            </div>
          </div>
          <div className="analytics-lower-grid">
            <QueryState
              query={trends}
              message="Unable to load historical performance."
              skeleton={<ChartSkeleton />}
            >
              {(data) => <HistoricalChart data={data} />}
            </QueryState>
            <QueryState
              query={distribution}
              message="Unable to load cohort segments."
              skeleton={<ChartSkeleton />}
            >
              {(data) => (
                <SegmentDistribution distribution={data.segment_distribution} />
              )}
            </QueryState>
          </div>
          <section className="insight-preview">
            <SectionHeading
              title="Signals worth a closer look"
              description="Context from your cohort, backed by the available data."
              action={
                <Link className="text-link" to={`/insights${cohortSearch}`}>
                  All insights <ArrowRight size={15} />
                </Link>
              }
            />
            <QueryState
              query={insights}
              message="Unable to load insights."
              skeleton={
                <div className="grid-three">
                  {[1, 2, 3].map((n) => (
                    <InsightSkeleton key={n} />
                  ))}
                </div>
              }
            >
              {(data) =>
                data.insights.length ? (
                  <div className="grid-three">
                    {data.insights.slice(0, 3).map((insight) => (
                      <InsightCard
                        key={insight.insight_id}
                        insight={insight}
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <div className="panel">
                    <EmptyState
                      title="No significant insights available for this cohort."
                      description="Insights depend on sufficient reported data."
                    />
                  </div>
                )
              }
            </QueryState>
          </section>
        </>
      )}
      <SpotlightCard className="understanding-note">
        <span className="note-icon">
          <Activity size={20} />
        </span>
        <div>
          <h2>A connected view. A considered perspective.</h2>
          <p>
            Explore the signals behind every score. Analytics support
            understanding and human judgment.
          </p>
        </div>
        <Link className="text-link" to={`/data${cohortSearch}`}>
          Explore the data <ArrowRight size={15} />
        </Link>
      </SpotlightCard>
    </div>
  );
}
