import { ChartNoAxesCombined, Lightbulb, Rows3 } from "lucide-react";
import type { Insight } from "@/types/api";
import { displayValue, humanize, number } from "@/utils/data";
import { RiskBadge } from "./Shared";
import "@/analytics.css";
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
          {humanize(insight.category.toLowerCase())}
        </span>
        <RiskBadge level={insight.priority} />
      </div>
      <h3>{insight.title}</h3>
      <p>{insight.description}</p>
      {insight.metric_value != null && (
        <div className="insight-value">
          {number(insight.metric_value)}
          <span>{insight.unit}</span>
          <ChartNoAxesCombined size={18} aria-hidden="true" />
        </div>
      )}
      {insight.comparison_value != null && (
        <p className="insight-comparison">
          <span>Comparison</span> {number(insight.comparison_value)}{" "}
          {insight.unit}
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
      {insight.trend_data.length > 0 && !compact && (
        <details className="insight-evidence">
          <summary>
            <Rows3 size={14} aria-hidden="true" /> View supporting periods{" "}
            <span>{insight.trend_data.length}</span>
          </summary>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">
                Reported periods for {insight.title}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Metric</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {insight.trend_data.map((point, index) => (
                  <tr key={`${point.period}-${point.metric}-${index}`}>
                    <td>{point.period}</td>
                    <td>{humanize(point.metric)}</td>
                    <td>{number(point.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </article>
  );
}
