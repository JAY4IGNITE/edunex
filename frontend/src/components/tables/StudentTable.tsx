import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Users, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { api } from "@/services/api";
import { useFilters } from "@/hooks/useFilters";
import { TableSkeleton } from "@/components/skeletons";
import { EmptyState, QueryState } from "@/components/states/States";
import { RiskBadge } from "@/components/cards/Shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { number, segmentName } from "@/utils/data";
import type { Student } from "@/types/api";

export function StudentTable({ highRisk = false }: { highRisk?: boolean }) {
  const { filters, cohortSearch } = useFilters();
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get("page") ?? 1);
  const page =
    Number.isSafeInteger(rawPage) && rawPage > 0
      ? Math.min(rawPage - 1, 1_000_000)
      : 0;
  const query = useQuery({
    queryKey: ["students", filters, page],
    queryFn: ({ signal }) => api.students(filters, page, signal),
  });
  function move(next: number) {
    const updated = new URLSearchParams(params);
    updated.set("page", String(next + 1));
    setParams(updated);
  }
  return (
    <QueryState
      query={query}
      message="Unable to load students."
      skeleton={<TableSkeleton />}
    >
      {(students) => (
        <section className="panel student-table-panel">
          <div className="table-heading">
            <div>
              <Users size={17} aria-hidden="true" />
              <h2>{highRisk ? "High Risk Students" : "Student directory"}</h2>
            </div>
            <span>
              {highRisk
                ? "Within this page"
                : `${students.length} students on this page`}
            </span>
          </div>
          {highRisk && (
            <p className="table-scope">
              Only HIGH assessments among the 10 students on this page are
              shown. This is not a complete cohort risk register.
            </p>
          )}
          {students.length ? (
            <StudentRows
              students={students}
              highRisk={highRisk}
              cohortSearch={cohortSearch}
            />
          ) : (
            <EmptyState
              title="No students match these filters."
              description={
                page
                  ? "You have reached an empty page. Return to the previous page or reset your filters."
                  : "Choose a different department, year, or semester."
              }
            />
          )}
          <div className="table-pagination">
            <p>
              Page {page + 1}
              <span> · 10 students per page</span>
            </p>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => move(page - 1)}
                disabled={page === 0}
                aria-label="Previous student page"
              >
                <ChevronLeft size={15} /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => move(page + 1)}
                disabled={students.length < 10}
                aria-label="Next student page"
              >
                Next <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        </section>
      )}
    </QueryState>
  );
}
function StudentRows({
  students,
  highRisk,
  cohortSearch,
}: {
  students: Student[];
  highRisk: boolean;
  cohortSearch: string;
}) {
  // Identity endpoint has no score/risk columns. Enrich only this bounded visible page.
  const explanations = useQueries({
    queries: students.map((student) => ({
      queryKey: ["explanation", student.student_id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api.explanation(student.student_id, signal),
    })),
  });
  const memberships = useQueries({
    queries: highRisk
      ? []
      : students.map((student) => ({
          queryKey: ["membership", student.student_id],
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            api.membership(student.student_id, signal),
        })),
  });
  const pending = explanations.some((q) => q.isPending);
  const failed = explanations.some((q) => q.isError);
  const visible = students
    .map((student, i) => ({
      student,
      explanation: explanations[i],
      membership: memberships[i],
    }))
    .filter(
      (row) =>
        !highRisk ||
        row.explanation.isPending ||
        row.explanation.isError ||
        row.explanation.data?.academic_risk.risk_level === "HIGH" ||
        row.explanation.data?.placement_risk.risk_level === "HIGH",
    );

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedVisible = [...visible].sort((a, b) => {
    if (!sortKey) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    
    const compareWithUnavailable = (valA: any, valB: any, compareFn: (a: any, b: any) => number) => {
      const aIsUnavail = valA === null || valA === undefined || valA === "Unavailable";
      const bIsUnavail = valB === null || valB === undefined || valB === "Unavailable";
      if (aIsUnavail && bIsUnavail) return 0;
      if (aIsUnavail) return 1;
      if (bIsUnavail) return -1;
      return compareFn(valA, valB) * dir;
    };

    switch (sortKey) {
      case "student_id":
        return a.student.student_id.localeCompare(b.student.student_id) * dir;
      case "department":
        return a.student.department.localeCompare(b.student.department) * dir;
      case "year":
        return (a.student.year - b.student.year) * dir;
      case "semester":
        return (a.student.semester - b.student.semester) * dir;
      case "success_score": {
        const valA = a.explanation.data?.success_score.score;
        const valB = b.explanation.data?.success_score.score;
        return compareWithUnavailable(valA, valB, (x, y) => x - y);
      }
      case "academic_risk": {
        const valA = a.explanation.data?.academic_risk.score;
        const valB = b.explanation.data?.academic_risk.score;
        return compareWithUnavailable(valA, valB, (x, y) => x - y);
      }
      case "placement_risk": {
        const valA = a.explanation.data?.placement_risk.score;
        const valB = b.explanation.data?.placement_risk.score;
        return compareWithUnavailable(valA, valB, (x, y) => x - y);
      }
      case "segment": {
        const valA = a.membership.data?.primary_segment;
        const valB = b.membership.data?.primary_segment;
        return compareWithUnavailable(valA, valB, (x, y) => x.localeCompare(y));
      }
      default:
        return 0;
    }
  });

  if (highRisk && !pending && !failed && !sortedVisible.length)
    return (
      <EmptyState
        title="No HIGH risk students on this page."
        description="Continue through the student pages to review further assessments."
      />
    );
  const SortHeader = ({ label, sortKeyName }: { label: string, sortKeyName: string }) => (
    <th 
      onClick={() => handleSort(sortKeyName)} 
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      aria-sort={sortKey === sortKeyName ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {label}
        {sortKey === sortKeyName ? (
          sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
        ) : (
          <ArrowUpDown size={14} className="muted" opacity={0.5} />
        )}
      </div>
    </th>
  );

  return (
    <div
      className="table-scroll student-records"
      role="region"
      aria-label={
        highRisk ? "High risk students on current page" : "Student records"
      }
      tabIndex={0}
    >
      <table role="table">
        <caption className="sr-only">
          Student identities and backend analytical assessments
        </caption>
        <thead role="rowgroup">
          <tr role="row">
            <SortHeader label="Student ID" sortKeyName="student_id" />
            <SortHeader label="Department" sortKeyName="department" />
            <SortHeader label="Year" sortKeyName="year" />
            <SortHeader label="Semester" sortKeyName="semester" />
            <SortHeader label="Success Score" sortKeyName="success_score" />
            <SortHeader label="Academic Risk" sortKeyName="academic_risk" />
            <SortHeader label="Placement Risk" sortKeyName="placement_risk" />
            {!highRisk && <SortHeader label="Segment" sortKeyName="segment" />}
            <th>
              <span className="sr-only">Open profile</span>
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {sortedVisible.map(({ student, explanation, membership }) => (
            <tr
              role="row"
              key={student.student_id}
              onClick={(event) => {
                if (
                  event.target instanceof Element &&
                  !event.target.closest("a, button")
                )
                  event.currentTarget
                    .querySelector<HTMLAnchorElement>("a")
                    ?.click();
              }}
            >
              <td
                data-label="Student ID"
                className="student-identity-cell"
                role="cell"
              >
                <Link
                  className="student-identity-link"
                  to={`/students/${encodeURIComponent(student.student_id)}${cohortSearch}`}
                >
                  <span className="student-monogram" aria-hidden="true">
                    {student.student_id.slice(-2)}
                  </span>
                  <span className="student-id">{student.student_id}</span>
                </Link>
              </td>
              <td data-label="Department" role="cell">
                {student.department}
              </td>
              <td data-label="Year" role="cell">
                {student.year}
              </td>
              <td data-label="Semester" role="cell">
                {student.semester}
              </td>
              {explanation.isPending ? (
                <td colSpan={3} data-label="Assessments" role="cell">
                  <Skeleton
                    className="h-5 w-full"
                    role="status"
                    aria-busy="true"
                    aria-label="Loading assessments"
                  />
                </td>
              ) : explanation.isError ? (
                <td colSpan={3} data-label="Assessments" role="cell">
                  <button
                    className="inline-retry"
                    onClick={() => {
                      void explanation.refetch();
                    }}
                  >
                    Assessment unavailable · Retry
                  </button>
                </td>
              ) : (
                <>
                  <td data-label="Success Score" role="cell">
                    <div
                      className="student-score-cell"
                      data-score-band={explanation.data.success_score.band}
                    >
                      <span className="table-score">
                        {number(explanation.data.success_score.score)}
                      </span>
                      <span className="table-score-band">
                        {explanation.data.success_score.band}
                      </span>
                      <div className="student-score-track" aria-hidden="true">
                        <span
                          style={{
                            width: `${Math.min(100, Math.max(0, explanation.data.success_score.score))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td data-label="Academic Risk" role="cell">
                    <RiskBadge
                      level={explanation.data.academic_risk.risk_level}
                    />
                  </td>
                  <td data-label="Placement Risk" role="cell">
                    <RiskBadge
                      level={explanation.data.placement_risk.risk_level}
                    />
                  </td>
                </>
              )}
              {!highRisk && (
                <td className="segment-cell" data-label="Segment" role="cell">
                  {membership?.isPending ? (
                    <Skeleton
                      className="h-4 w-28"
                      role="status"
                      aria-busy="true"
                      aria-label="Loading segment membership"
                    />
                  ) : membership?.isError ? (
                    <button
                      className="inline-retry"
                      onClick={() => {
                        void membership.refetch();
                      }}
                    >
                      Unavailable · Retry
                    </button>
                  ) : membership?.data?.primary_segment ? (
                    segmentName(membership.data.primary_segment)
                  ) : (
                    <span className="muted">No assigned segment</span>
                  )}
                </td>
              )}
              <td className="student-row-arrow" role="cell">
                <ArrowRight size={15} aria-hidden="true" className="muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
