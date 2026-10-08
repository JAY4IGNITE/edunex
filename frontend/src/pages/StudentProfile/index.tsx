import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Layers3,
  ShieldCheck,
  BriefcaseBusiness,
} from "lucide-react";
import { api } from "@/services/api";
import { ApiError } from "@/services/api/client";
import { useFilters } from "@/hooks/useFilters";
import { useEntrance } from "@/hooks/useMotion";
import {
  PageHeading,
  RiskBadge,
  MetricList,
  SectionHeading,
} from "@/components/cards/Shared";
import { QueryState, ErrorState, EmptyState } from "@/components/states/States";
import {
  ProfileSkeleton,
  KPISkeleton,
  ChartSkeleton,
  SegmentSkeleton,
} from "@/components/skeletons";
import { number, segmentName } from "@/utils/data";
import { ExplanationPanels, MissingSignals } from "./ExplanationPanels";
import { DomainHistory } from "./DomainHistory";
export default function StudentProfile() {
  const id = useParams().studentId ?? "";
  const { cohortSearch } = useFilters();
  const student = useQuery({
    queryKey: ["student", id],
    queryFn: ({ signal }) => api.student(id, signal),
  });
  const score = useQuery({
    queryKey: ["score", id],
    queryFn: ({ signal }) => api.score(id, signal),
    enabled: student.isSuccess,
  });
  const academic = useQuery({
    queryKey: ["academic-risk", id],
    queryFn: ({ signal }) => api.academicRisk(id, signal),
    enabled: student.isSuccess,
  });
  const placement = useQuery({
    queryKey: ["placement-risk", id],
    queryFn: ({ signal }) => api.placementRisk(id, signal),
    enabled: student.isSuccess,
  });
  const explanation = useQuery({
    queryKey: ["explanation", id],
    queryFn: ({ signal }) => api.explanation(id, signal),
    enabled: student.isSuccess,
  });
  const membership = useQuery({
    queryKey: ["membership", id],
    queryFn: ({ signal }) => api.membership(id, signal),
    enabled: student.isSuccess,
  });
  const ref = useEntrance(
    score.isSuccess &&
      academic.isSuccess &&
      placement.isSuccess &&
      membership.isSuccess,
  );
  if (student.isPending) return <ProfileSkeleton />;
  if (student.isError)
    return (
      <>
        <h1>Student 360</h1>
        {student.error instanceof ApiError && student.error.status === 404 ? (
          <EmptyState
            title="Student not found."
            description="This student ID is not present in the available records. Return to the directory to choose a student."
          />
        ) : (
          <ErrorState
            message="Unable to load student profile."
            retry={() => {
              void student.refetch();
            }}
          />
        )}
        <Link className="text-link" to={`/students${cohortSearch}`}>
          Return to students
        </Link>
      </>
    );
  const identity = student.data.student;
  return (
    <div ref={ref}>
      <Link className="text-link back-link" to={`/students${cohortSearch}`}>
        <ArrowLeft size={15} /> Back to students
      </Link>
      <PageHeading
        eyebrow="Student 360"
        title={identity.student_id}
        description={`${identity.department} · Year ${identity.year} · Semester ${identity.semester} · Section ${identity.section} · ${identity.academic_year}`}
      />
      <div className="profile-top">
        <QueryState
          query={score}
          skeleton={<ChartSkeleton />}
          message="Unable to load success score."
        >
          {(data) => (
            <section className="panel profile-score" data-reveal>
              <p className="eyebrow">Student Success Score</p>
              <div>
                <strong>{number(data.success_score)}</strong>
                <span>/ 100</span>
              </div>
              <span className="score-band">{data.band}</span>
              <p>
                Calculated from {data.available_domains.length} available
                domains.
              </p>
              <MissingSignals
                signals={data.missing_domains}
                label="Unavailable domains"
              />
            </section>
          )}
        </QueryState>
        <div className="profile-risk-stack">
          <QueryState
            query={academic}
            skeleton={<KPISkeleton />}
            message="Unable to load academic risk."
          >
            {(data) => (
              <section className="panel" data-reveal>
                <SectionHeading
                  title="Academic Risk"
                  action={<ShieldCheck size={19} className="muted" />}
                />
                <div className="profile-risk-value">
                  <strong>
                    {number(data.academic_risk_score)}
                    <small>/ 100</small>
                  </strong>
                  <RiskBadge level={data.risk_level} />
                </div>
                <p className="paragraph-small muted">
                  {data.assessment_period
                    ? `Semester ${data.assessment_period.semester} · ${data.assessment_period.academic_year}`
                    : "Assessment period unavailable"}
                </p>
              </section>
            )}
          </QueryState>
          <QueryState
            query={placement}
            skeleton={<KPISkeleton />}
            message="Unable to load placement risk."
          >
            {(data) => (
              <section className="panel" data-reveal>
                <SectionHeading
                  title="Placement Risk"
                  action={<BriefcaseBusiness size={19} className="muted" />}
                />
                <div className="profile-risk-value">
                  <strong>
                    {number(data.placement_risk_score)}
                    <small>/ 100</small>
                  </strong>
                  <RiskBadge level={data.risk_level} />
                </div>
                <p className="paragraph-small muted">
                  Placement assessed:{" "}
                  {data.assessment_metadata.placement_assessment_date ??
                    "Unavailable"}{" "}
                  · Skills assessed:{" "}
                  {data.assessment_metadata.skills_assessment_date ??
                    "Unavailable"}
                </p>
              </section>
            )}
          </QueryState>
        </div>
        <QueryState
          query={membership}
          skeleton={<SegmentSkeleton />}
          message="Unable to load student segment."
        >
          {(data) => (
            <section className="panel profile-segment" data-reveal>
              <span className="segment-icon">
                <Layers3 size={22} />
              </span>
              <p className="eyebrow">Analytical Segment</p>
              <h2>
                {data.primary_segment
                  ? segmentName(data.primary_segment)
                  : "No primary segment assigned"}
              </h2>
              <p>
                Descriptive grouping based on the available analytical signals.
              </p>
              {data.secondary_segments.length > 0 && (
                <MetricList
                  entries={data.secondary_segments.map((s, i) => ({
                    label: `Secondary ${i + 1}`,
                    value: segmentName(s),
                  }))}
                />
              )}
              <Link className="text-link" to={`/segments${cohortSearch}`}>
                Explore analytical segments
              </Link>
            </section>
          )}
        </QueryState>
      </div>
      <QueryState
        query={explanation}
        skeleton={<ChartSkeleton />}
        message="Unable to load score explanations."
      >
        {(data) => <ExplanationPanels explanation={data} />}
      </QueryState>
      <DomainHistory student={student.data} />
    </div>
  );
}
