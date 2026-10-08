import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Layers3,
  ArrowUpRight,
  GraduationCap,
  BookOpen,
  BriefcaseBusiness,
  ShieldAlert,
  Activity,
  CircleDashed,
} from "lucide-react";
import { api } from "@/services/api";
import { useFilters } from "@/hooks/useFilters";
import {
  PageHeading,
  SectionHeading,
  MetricList,
} from "@/components/cards/Shared";
import { QueryState, EmptyState } from "@/components/states/States";
import { SegmentSkeleton, ChartSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { humanize, number } from "@/utils/data";
import "@/analytics.css";

const segmentIcons: Record<string, typeof Layers3> = {
  HIGH_ACADEMIC_HIGH_PLACEMENT: GraduationCap,
  HIGH_ACADEMIC_LOW_PLACEMENT: BookOpen,
  LOW_ACADEMIC_HIGH_PLACEMENT: BriefcaseBusiness,
  LOW_ACADEMIC_LOW_PLACEMENT: ShieldAlert,
  HIGH_ENGAGEMENT_LOW_ACADEMIC: Activity,
  LOW_ENGAGEMENT_LOW_ACADEMIC: CircleDashed,
};

export default function Segments() {
  const { filters, filtered, cohortSearch } = useFilters();
  const [selected, setSelected] = useState<string | null>(null);
  const [memberPage, setMemberPage] = useState(0);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const summary = useQuery({
    queryKey: ["segments"],
    queryFn: ({ signal }) => api.segments(signal),
    staleTime: 15 * 60 * 1000,
  });
  const overview = useQuery({
    queryKey: ["overview", filters],
    queryFn: ({ signal }) => api.overview(filters, signal),
    enabled: filtered,
  });
  const distribution = useQuery({
    queryKey: ["distribution", filters],
    queryFn: ({ signal }) => api.distribution(filters, signal),
    enabled: filtered && overview.isSuccess,
  });
  const detail = useQuery({
    queryKey: ["segment", selected],
    queryFn: ({ signal }) => api.segment(selected!, signal),
    enabled: selected !== null,
    staleTime: 15 * 60 * 1000,
  });
  function cards(
    counts?: Record<string, number>,
    total?: number,
    available = true,
  ) {
    if (!summary.data?.segments.length)
      return (
        <div className="panel">
          <EmptyState title="No segment data available." />
        </div>
      );
    return (
      <div className="grid-three segment-grid">
        {summary.data.segments.map((segment, index) => {
          const SegmentIcon = segmentIcons[segment.segment_id] ?? Layers3;
          const count = filtered
            ? available
              ? (counts?.[segment.segment_id] ?? 0)
              : null
            : segment.student_count;
          const percentage = filtered
            ? count != null && total
              ? (count / total) * 100
              : count === 0
                ? 0
                : null
            : segment.percentage_of_population;
          return (
            <article
              className={`panel segment-card segment-tone-${(index % 6) + 1}`}
              key={segment.segment_id}
            >
              <div className="segment-card-top">
                <span className="segment-icon">
                  <SegmentIcon size={21} aria-hidden="true" />
                </span>
                <span className="segment-index">0{index + 1}</span>
              </div>
              <p className="eyebrow">Analytical Segment</p>
              <h2>{segment.name}</h2>
              <p>{segment.description}</p>
              <div className="segment-population">
                <strong>{number(count, 0)}</strong>
                <div>
                  <span>students</span>
                  <small>
                    {number(percentage)}
                    {percentage != null ? "% of population" : ""}
                  </small>
                </div>
              </div>
              {percentage != null && (
                <div
                  className="segment-meter segment-population-meter"
                  aria-hidden="true"
                >
                  <span
                    style={{
                      width: `${Math.min(100, Math.max(0, percentage))}%`,
                    }}
                  />
                </div>
              )}
              <p className="segment-criteria">
                <span className="criteria-label">Selection criteria</span>
                {segment.criteria}
              </p>
              <Button
                variant="outline"
                className="segment-detail-button"
                onClick={(event) => {
                  detailTrigger.current = event.currentTarget;
                  setSelected(segment.segment_id);
                  setMemberPage(0);
                }}
              >
                View characteristics <ArrowUpRight size={15} />
              </Button>
            </article>
          );
        })}
      </div>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="Analytical segments"
        title="Different patterns. A shared campus."
        description="Explore the configured student groups and the characteristics that bring each into focus."
      />
      <p className="scope-note">
        {filtered
          ? "Card populations reflect your selected cohort. Detailed characteristics and member lists cover the whole institution."
          : "Institution-wide analytical segments. Some students may not belong to a configured segment."}{" "}
        These are descriptive groupings, not causal classifications.
      </p>
      <QueryState
        query={summary}
        message="Unable to load segments."
        skeleton={
          <div className="grid-three">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <SegmentSkeleton key={n} />
            ))}
          </div>
        }
      >
        {() =>
          filtered ? (
            <QueryState
              query={overview}
              message="Unable to load cohort population."
              skeleton={<ChartSkeleton />}
            >
              {(cohort) => (
                <QueryState
                  query={distribution}
                  message="Unable to load cohort segments."
                  skeleton={<ChartSkeleton />}
                >
                  {(data) =>
                    cards(
                      data.segment_distribution,
                      cohort.total_students,
                      cohort.total_students === 0 ||
                        Object.keys(data.success_score_distribution).length >
                          0 ||
                        Object.keys(data.academic_risk_distribution).length > 0,
                    )
                  }
                </QueryState>
              )}
            </QueryState>
          ) : (
            cards()
          )
        }
      </QueryState>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent
          className="segment-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            detailTrigger.current?.focus();
          }}
        >
          <DialogTitle>{detail.data?.name ?? "Analytical Segment"}</DialogTitle>
          <DialogDescription>
            Institution-wide characteristics and members. Cohort filters do not
            apply to this detail.
          </DialogDescription>
          <QueryState
            query={detail}
            message="Unable to load segment details."
            skeleton={<ChartSkeleton />}
          >
            {(data) => (
              <>
                <p className="paragraph-small muted">{data.description}</p>
                <MetricList
                  entries={[
                    { label: "Students", value: number(data.student_count, 0) },
                    {
                      label: "Share of institution",
                      value: `${number(data.percentage_of_population)}%`,
                    },
                    ...Object.entries(data.characteristics).map(
                      ([label, value]) => ({
                        label: humanize(label),
                        value: number(value),
                      }),
                    ),
                  ]}
                />
                <SectionHeading
                  title="Segment members"
                  description={`${number(data.students.length, 0)} students returned by the backend`}
                />
                {data.students.length ? (
                  <>
                    <div className="member-grid">
                      {data.students
                        .slice(memberPage * 20, (memberPage + 1) * 20)
                        .map((id) => (
                          <Link
                            key={id}
                            className="member-link"
                            to={`/students/${encodeURIComponent(id)}${cohortSearch}`}
                          >
                            {id}
                            <ArrowUpRight size={13} />
                          </Link>
                        ))}
                    </div>
                    <div className="table-pagination">
                      <span>Page {memberPage + 1}</span>
                      <div>
                        <Button
                          variant="outline"
                          onClick={() => setMemberPage((p) => p - 1)}
                          disabled={!memberPage}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setMemberPage((p) => p + 1)}
                          disabled={
                            (memberPage + 1) * 20 >= data.students.length
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState title="No students in this segment." />
                )}
              </>
            )}
          </QueryState>
        </DialogContent>
      </Dialog>
    </>
  );
}
