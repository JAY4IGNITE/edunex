export type CapacityScenario = {
  estimatedHighRiskCases: number;
  availableCapacity: number;
  uncoveredCases: number;
  coveragePercent: number;
};

export function estimateCapacity(
  academicHigh: number,
  placementHigh: number,
  advisors: number,
  casesPerAdvisorPerWeek: number,
  weeks: number,
): CapacityScenario {
  const estimatedHighRiskCases = Math.max(0, academicHigh, placementHigh);
  const availableCapacity =
    Math.max(0, advisors) *
    Math.max(0, casesPerAdvisorPerWeek) *
    Math.max(0, weeks);
  return {
    estimatedHighRiskCases,
    availableCapacity,
    uncoveredCases: Math.max(0, estimatedHighRiskCases - availableCapacity),
    coveragePercent:
      estimatedHighRiskCases === 0
        ? 100
        : Math.min(100, Math.round((availableCapacity / estimatedHighRiskCases) * 100)),
  };
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const raw = String(value);
          const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
          return `"${safe.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}
