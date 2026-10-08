import { ArrowRight, ChartScatter } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeading } from "@/components/cards/Shared";
import { EmptyState } from "@/components/states/States";
import { useFilters } from "@/hooks/useFilters";
import { number, segmentName } from "@/utils/data";

export function SegmentDistribution({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const { cohortSearch } = useFilters();
  const entries = Object.entries(distribution);
  const largest = Math.max(0, ...entries.map(([, count]) => count));

  return (
    <section className="panel segment-distribution">
      <SectionHeading
        title="Student segments"
        description="Patterns across the selected cohort."
        action={
          <Link
            className="icon-link"
            to={`/segments${cohortSearch}`}
            aria-label="Explore student segments"
          >
            <ArrowRight size={18} />
          </Link>
        }
      />
      {entries.length && largest > 0 ? (
        <dl className="segment-distribution-list">
          {entries.map(([id, count], index) => (
            <div key={id}>
              <dt>{segmentName(id)}</dt>
              <dd>
                {number(count, 0)} <span className="sr-only">students</span>
              </dd>
              <div className="segment-meter" aria-hidden="true">
                <span
                  style={{
                    width: `${(count / largest) * 100}%`,
                    background: `var(--chart-${(index % 6) + 1})`,
                  }}
                />
              </div>
            </div>
          ))}
        </dl>
      ) : (
        <EmptyState
          title="No segment data available."
          description="No reported segment memberships for this selection."
        />
      )}
      <p className="panel-footnote">
        <ChartScatter size={13} aria-hidden="true" /> Explore segments for criteria
        and characteristics.
      </p>
    </section>
  );
}
