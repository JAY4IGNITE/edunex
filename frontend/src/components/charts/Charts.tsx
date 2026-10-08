import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Trends } from "@/types/api";
import { number, trendRows } from "@/utils/data";
import { useReducedMotion } from "@/hooks/useMotion";
import { EmptyState } from "@/components/states/States";
import { SectionHeading, RiskBadge } from "@/components/cards/Shared";
import { useFilters } from "@/hooks/useFilters";
import { AnalyticsTooltip } from "./AnalyticsTooltip";
import "@/analytics.css";
const bandColors: Record<string, string> = {
  Excellent: "var(--success)",
  Good: "var(--chart-1)",
  Moderate: "var(--warning)",
  "Needs Attention": "var(--danger)",
};
export function SuccessDistribution({
  distribution,
  average,
}: {
  distribution: Record<string, number>;
  average: number | null;
}) {
  const reduced = useReducedMotion();
  const entries = Object.entries(distribution).map(([name, value]) => ({
    name,
    value,
  }));
  const total = entries.reduce((sum, row) => sum + row.value, 0);
  return (
    <section className="panel success-panel">
      <SectionHeading
        title="Success at a glance"
        description="Student Success Score · distribution across your cohort"
      />
      {total ? (
        <div className="score-distribution">
          <div
            className="donut"
            role="img"
            aria-label={`Success score distribution. Average ${number(average)} out of 100.`}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart accessibilityLayer>
                <Pie
                  data={entries}
                  innerRadius="73%"
                  outerRadius="94%"
                  dataKey="value"
                  stroke="none"
                  paddingAngle={3}
                  isAnimationActive={!reduced}
                  animationDuration={500}
                >
                  {entries.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={bandColors[entry.name] ?? "var(--text-secondary)"}
                    />
                  ))}
                </Pie>
                <Tooltip content={<AnalyticsTooltip unit="students" />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <span>Average score</span>
              <strong>{number(average)}</strong>
              <small>out of 100</small>
            </div>
          </div>
          <dl className="band-legend">
            {["Excellent", "Good", "Moderate", "Needs Attention"].map(
              (name) => (
                <div key={name}>
                  <dt>
                    <i style={{ background: bandColors[name] }} />
                    {name}
                  </dt>
                  <dd>
                    {number(distribution[name] ?? 0, 0)}
                    <small>
                      {number(((distribution[name] ?? 0) / total) * 100)}%
                    </small>
                  </dd>
                </div>
              ),
            )}
          </dl>
        </div>
      ) : (
        <EmptyState
          title="No score distribution available"
          description="The selected cohort has no reportable scores."
        />
      )}
      <p className="panel-footnote">
        Reported score bands · {number(total, 0)} assessed students
      </p>
    </section>
  );
}
export function RiskDistribution({
  title,
  distribution,
}: {
  title: string;
  distribution: Record<string, number>;
}) {
  const { cohortSearch } = useFilters();
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  return (
    <section className="panel risk-panel">
      <SectionHeading
        title={title}
        action={
          <Link
            className="icon-link"
            to={`/risks${cohortSearch}`}
            aria-label={`Explore ${title.toLowerCase()}`}
          >
            <ArrowRight size={18} />
          </Link>
        }
      />
      {total ? (
        <>
          <div className="risk-summary">
            <strong>{number(distribution.HIGH ?? 0, 0)}</strong>
            <div>
              <RiskBadge level="HIGH" />
              <p>
                students requiring attention ·{" "}
                {number(((distribution.HIGH ?? 0) / total) * 100)}% of assessed
              </p>
            </div>
          </div>
          <div className="risk-bar" aria-hidden="true">
            {["LOW", "MEDIUM", "HIGH"].map((level) => (
              <span
                key={level}
                className={`risk-fill-${level.toLowerCase()}`}
                style={{
                  width: `${((distribution[level] ?? 0) / total) * 100}%`,
                }}
              />
            ))}
          </div>
          <dl className="risk-legend">
            {["LOW", "MEDIUM", "HIGH"].map((level) => (
              <div key={level}>
                <dt>{level}</dt>
                <dd>{number(distribution[level] ?? 0, 0)}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <EmptyState
          title="No risk assessments available"
          description="Try a broader cohort."
        />
      )}
    </section>
  );
}
export function HistoricalChart({ data }: { data: Trends }) {
  const [metric, setMetric] = useState<"success" | "attendance" | "engagement">(
    "success",
  );
  const reduced = useReducedMotion();
  const gradientId = `trend-${useId().replace(/:/g, "")}`;
  const rows = trendRows(data);
  const available = rows.filter((row) => row[metric] != null);
  const label =
    metric === "success"
      ? "Success Score"
      : metric === "attendance"
        ? "Attendance"
        : "Engagement";
  const chartColor =
    metric === "attendance"
      ? "var(--chart-2)"
      : metric === "engagement"
        ? "var(--chart-3)"
        : "var(--chart-1)";
  return (
    <section className="panel history-panel">
      <SectionHeading
        title="Historical Performance"
        description="Descriptive trends across available academic periods."
      />
      <div
        className="chart-controls"
        role="group"
        aria-label="Historical metric"
      >
        {(["success", "attendance", "engagement"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={metric === key}
            onClick={() => setMetric(key)}
          >
            {key === "success"
              ? "Success Score"
              : key === "attendance"
                ? "Attendance"
                : "Engagement"}
          </button>
        ))}
      </div>
      {available.length < 2 ? (
        <EmptyState
          title="Not enough historical data"
          description="Not enough historical periods to display a trend. At least two reported periods are needed."
        />
      ) : (
        <>
          <div
            className="trend-chart"
            role="img"
            aria-label={`${label} across ${available.length} academic periods. Exact values are in the data table below.`}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                data={rows}
                margin={{ top: 18, right: 15, bottom: 0, left: -22 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={chartColor}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor={chartColor}
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 5"
                  vertical={false}
                  stroke="var(--chart-grid)"
                />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                  tickMargin={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                  domain={metric === "engagement" ? [0, "auto"] : [0, 100]}
                />
                <Tooltip
                  content={
                    <AnalyticsTooltip
                      unit={
                        metric === "attendance"
                          ? "%"
                          : metric === "engagement"
                            ? "index"
                            : "/ 100"
                      }
                    />
                  }
                  cursor={{
                    stroke: "var(--border-hover)",
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  name={label}
                  stroke={chartColor}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={{ r: 3, strokeWidth: 2, fill: "var(--background)" }}
                  activeDot={{
                    r: 5,
                    stroke: "var(--background)",
                    strokeWidth: 3,
                  }}
                  connectNulls={false}
                  isAnimationActive={!reduced}
                  animationDuration={450}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <details className="chart-data">
            <summary>
              View exact values · {label}
              {metric === "attendance"
                ? " (%)"
                : metric === "engagement"
                  ? " (index)"
                  : " (0–100)"}
            </summary>
            <table>
              <caption className="sr-only">Historical {label}</caption>
              <thead>
                <tr>
                  <th>Academic period</th>
                  <th>{label}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{number(row[metric])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
