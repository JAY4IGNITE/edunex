import { number } from "@/utils/data";

export function ScoreRing({
  value,
  band,
  label = "Success score",
  size = "md",
}: {
  value: number | null | undefined;
  band?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const available = value != null && Number.isFinite(value);
  const progress = available ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <div className={`score-ring score-ring-${size}`} data-score-band={band}>
      <div className="score-ring-visual">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="score-ring-track" cx="60" cy="60" r="51" />
          <circle
            className="score-ring-progress"
            cx="60"
            cy="60"
            r="51"
            pathLength="100"
            strokeDasharray={`${progress} 100`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="score-ring-value">
          <strong>{available ? number(value) : "—"}</strong>
          {available && <span>out of 100</span>}
        </div>
      </div>
      <span className="sr-only">
        {label}: {available ? `${number(value)} out of 100` : "Unavailable"}
      </span>
      {band && <span className="score-ring-band">{band}</span>}
    </div>
  );
}
