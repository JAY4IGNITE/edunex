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
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Trends } from "@/types/api";
import { number, trendRows } from "@/utils/data";
import { useReducedMotion } from "@/hooks/useMotion";
import { EmptyState } from "@/components/states/States";
import { SectionHeading, RiskBadge } from "@/components/cards/Shared";
import { useFilters } from "@/hooks/useFilters";
const bandColors: Record<string, string> = {
  Excellent: "#538977",
  Good: "#7e9baf",
  Moderate: "#c3a36a",
  "Needs Attention": "#bd7874",
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
        description="A fuller picture of student performance."
      />
      {total ? (
        <div className="score-distribution">
          <div
            className="donut"
            role="img"
            aria-label={`Success score distribution. Average ${number(average)} out of 100.`}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
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
                      fill={bandColors[entry.name] ?? "#7e8a97"}
                    />
                  ))}
                </Pie>
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
                  <dd>{number(distribution[name] ?? 0, 0)}</dd>
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
        Backend score bands · {number(total, 0)} assessed students
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
            <ArrowUpRight size={18} />
          </Link>
        }
      />
      {total ? (
        <>
          <div className="risk-summary">
            <strong>{number(distribution.HIGH ?? 0, 0)}</strong>
            <div>
              <RiskBadge level="HIGH" />
              <p>students requiring attention</p>
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
                    <stop offset="0%" stopColor="#577d98" stopOpacity={0.2} />
                    <stop
                      offset="100%"
                      stopColor="#577d98"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 5"
                  vertical={false}
                  stroke="#e5e9ed"
                />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#627081" }}
                  tickMargin={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#627081" }}
                  domain={metric === "engagement" ? [0, "auto"] : [0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid #e2e7ec",
                    boxShadow: "0 8px 30px #1c263010",
                  }}
                  formatter={(value) => [
                    number(typeof value === "number" ? value : Number(value)),
                    label,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  name={label}
                  stroke="#577d98"
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 5 }}
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
