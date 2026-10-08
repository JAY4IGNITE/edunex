import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { number } from "@/utils/data";
import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
export function RiskBadge({ level }: { level?: string | null }) {
  const Icon =
    level === "LOW"
      ? CircleCheck
      : level === "HIGH"
        ? CircleAlert
        : level === "MEDIUM"
          ? TriangleAlert
          : CircleHelp;
  return (
    <Badge
      variant="outline"
      className={`risk-badge risk-${level?.toLowerCase() ?? "unavailable"}`}
    >
      <Icon size={12} aria-hidden="true" />
      {level ?? "Unavailable"}
    </Badge>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </header>
  );
}
export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Metric({
  label,
  value,
  suffix = "",
  context,
  icon,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
  context: string;
  icon: ReactNode;
}) {
  return (
    <GlassCard className="kpi" variant="interactive" data-reveal>
      <div className="kpi-top">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`kpi-value ${value == null ? "unavailable-value" : ""}`}>
        {number(value)}
        {value != null && <span>{suffix}</span>}
      </div>
      <p>{context}</p>
    </GlassCard>
  );
}
export function MetricList({
  entries,
}: {
  entries: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="metric-list">
      {entries.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
