import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight, Users } from "lucide-react";
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
  if (highRisk && !pending && !failed && !visible.length)
    return (
      <EmptyState
        title="No HIGH risk students on this page."
        description="Continue through the student pages to review further assessments."
      />
    );
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label={
        highRisk ? "High risk students on current page" : "Student records"
      }
      tabIndex={0}
    >
      <table>
        <caption className="sr-only">
          Student identities and backend analytical assessments
        </caption>
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Department</th>
            <th>Year</th>
            <th>Semester</th>
            <th>Success Score</th>
            <th>Academic Risk</th>
            <th>Placement Risk</th>
            {!highRisk && <th>Segment</th>}
            <th>
              <span className="sr-only">Open profile</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map(({ student, explanation, membership }) => (
            <tr
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
              <td>
                <Link
                  className="student-id"
                  to={`/students/${encodeURIComponent(student.student_id)}${cohortSearch}`}
                >
                  {student.student_id}
                </Link>
              </td>
              <td>{student.department}</td>
              <td>{student.year}</td>
              <td>{student.semester}</td>
              {explanation.isPending ? (
                <td colSpan={3}>
                  <Skeleton
                    className="h-5 w-full"
                    role="status"
                    aria-busy="true"
                    aria-label="Loading assessments"
                  />
                </td>
              ) : explanation.isError ? (
                <td colSpan={3}>
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
                  <td>
                    <span className="table-score">
                      {number(explanation.data.success_score.score)}
                    </span>
                    <span className="table-score-band">
                      {explanation.data.success_score.band}
                    </span>
                  </td>
                  <td>
                    <RiskBadge
                      level={explanation.data.academic_risk.risk_level}
                    />
                  </td>
                  <td>
                    <RiskBadge
                      level={explanation.data.placement_risk.risk_level}
                    />
                  </td>
                </>
              )}
              {!highRisk && (
                <td className="segment-cell">
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
              <td>
                <ArrowUpRight size={15} aria-hidden="true" className="muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
