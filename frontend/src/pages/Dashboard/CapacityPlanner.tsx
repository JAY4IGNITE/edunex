import { useState } from "react";
import { Download, Printer } from "lucide-react";
import type { Overview, Trends } from "@/types/api";
import type { Filters } from "@/types/api";
import { Button } from "@/components/ui/button";
import { estimateCapacity, toCsv } from "@/utils/capacity";

function downloadCsv(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CapacityPlanner({ overview, trends, filters }: {
  overview: Overview;
  trends: Trends;
  filters: Filters;
}) {
  const [advisors, setAdvisors] = useState(5);
  const [casesPerWeek, setCasesPerWeek] = useState(4);
  const [weeks, setWeeks] = useState(4);
  const academicHigh = overview.academic_risk_distribution.HIGH ?? 0;
  const placementHigh = overview.placement_risk_distribution.HIGH ?? 0;
  const scenario = estimateCapacity(academicHigh, placementHigh, advisors, casesPerWeek, weeks);

  function exportCsv() {
    const rows: (string | number)[][] = [
      ["EduNex cohort planning snapshot"],
      ["Synthetic demonstration data; capacity values are editable scenario assumptions."],
      ["Department", filters.department ?? "All departments"],
      ["Year", filters.year ?? "All years"],
      ["Semester", filters.semester ?? "All semesters"],
      [],
      ["Metric", "Value"],
      ["Students in cohort", overview.total_students],
      ["Average success score", overview.average_success_score ?? "Not available"],
      ["Average attendance (%)", overview.average_attendance ?? "Not available"],
      ["Average engagement index", overview.average_engagement_index ?? "Not available"],
      ["High academic-risk records", academicHigh],
      ["High placement-risk records", placementHigh],
      ["Estimated high-risk cases (larger count; overlap unknown)", scenario.estimatedHighRiskCases],
      ["Advisors (scenario assumption)", advisors],
      ["Cases per advisor per week (scenario assumption)", casesPerWeek],
      ["Planning weeks (scenario assumption)", weeks],
      ["Available capacity", scenario.availableCapacity],
      ["Uncovered estimated cases", scenario.uncoveredCases],
      ["Estimated coverage (%)", scenario.coveragePercent],
      [],
      ["Period", "Average success score", "Average attendance", "Average engagement"],
      ...Array.from(new Set([
        ...Object.keys(trends.success_score_trends),
        ...Object.keys(trends.attendance_trends),
        ...Object.keys(trends.engagement_trends),
      ])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((period) => [
        period,
        trends.success_score_trends[period] ?? "",
        trends.attendance_trends[period] ?? "",
        trends.engagement_trends[period] ?? "",
      ]),
    ];
    downloadCsv("edunex-cohort-planning.csv", toCsv(rows));
  }

  return (
    <section className="panel capacity-planner" aria-labelledby="capacity-title">
      <div className="capacity-heading">
        <div>
          <h2 id="capacity-title">Support capacity scenario</h2>
          <p>Estimate whether a staffing plan can cover the observed high-risk signals.</p>
        </div>
        <div className="capacity-actions">
          <Button variant="secondary" onClick={exportCsv}><Download size={15} /> Export CSV</Button>
          <Button variant="ghost" onClick={() => window.print()}><Printer size={15} /> Print view</Button>
        </div>
      </div>
      <p className="capacity-caveat">
        Planning estimate only. Academic and placement risk counts may include the same students, so this uses the larger count and does not add them together. Staffing inputs are assumptions, not measured workload.
      </p>
      <div className="capacity-controls">
        <label>Advisors <input type="number" min="0" max="500" value={advisors} onChange={(event) => setAdvisors(Number(event.target.value))} /></label>
        <label>Cases per advisor / week <input type="number" min="0" max="100" value={casesPerWeek} onChange={(event) => setCasesPerWeek(Number(event.target.value))} /></label>
        <label>Planning weeks <input type="number" min="1" max="52" value={weeks} onChange={(event) => setWeeks(Number(event.target.value))} /></label>
      </div>
      <div className="capacity-results" aria-live="polite">
        <div><span>Estimated high-risk cases</span><strong>{scenario.estimatedHighRiskCases}</strong></div>
        <div><span>Available capacity</span><strong>{scenario.availableCapacity}</strong></div>
        <div><span>Uncovered cases</span><strong>{scenario.uncoveredCases}</strong></div>
        <div><span>Estimated coverage</span><strong>{scenario.coveragePercent}%</strong></div>
      </div>
      <p className="capacity-footnote">Coverage compares estimated cases with advisor capacity across {weeks} weeks for the selected cohort.</p>
    </section>
  );
}
