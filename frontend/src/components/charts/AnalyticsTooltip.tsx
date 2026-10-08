import type { ReactNode } from "react";
import { number } from "@/utils/data";

type TooltipEntry = {
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  color?: string;
};

export function AnalyticsTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: ReactNode;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="analytics-tooltip">
      {label != null && <p>{label}</p>}
      {payload.map((entry, index) => (
        <div key={`${entry.name}-${index}`}>
          <span>{entry.name}</span>
          <strong>
            {typeof entry.value === "number"
              ? number(entry.value)
              : String(entry.value ?? "Unavailable")}
            {unit && <small> {unit}</small>}
          </strong>
        </div>
      ))}
    </div>
  );
}
