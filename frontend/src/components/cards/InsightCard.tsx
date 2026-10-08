import { ArrowUpRight, Lightbulb } from "lucide-react";
import type { Insight } from "@/types/api";
import { displayValue, number } from "@/utils/data";
import { RiskBadge } from "./Shared";
export function InsightCard({
  insight,
  compact = false,
}: {
  insight: Insight;
  compact?: boolean;
}) {
  return (
    <article className={`panel insight-card ${compact ? "compact" : ""}`}>
      <div className="insight-meta">
        <span>
          <Lightbulb size={15} aria-hidden="true" />
          {insight.category}
        </span>
        <RiskBadge level={insight.priority} />
      </div>
      <h3>{insight.title}</h3>
      <p>{insight.description}</p>
      {insight.metric_value != null && (
        <div className="insight-value">
          {number(insight.metric_value)}
          <span>{insight.unit}</span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </div>
      )}
      {insight.comparison_value != null && (
        <p>
          Comparison: {number(insight.comparison_value)} {insight.unit}
        </p>
      )}
      {insight.supporting_metrics.length > 0 && (
        <dl className="supporting-metrics">
          {insight.supporting_metrics.map((metric, i) => (
            <div key={`${metric.name}-${i}`}>
              <dt>{metric.name}</dt>
              <dd>
                {displayValue(metric.value)} {metric.unit}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {insight.insufficient_sample && (
        <p className="scope-note">
          Insufficient sample for a reliable comparison.
        </p>
      )}
    </article>
  );
}
