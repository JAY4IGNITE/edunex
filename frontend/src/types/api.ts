// Contracts mirrored from backend/app/schemas and API endpoint response models.
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export interface Filters {
  department?: string;
  year?: number;
  semester?: number;
}
export interface Distribution {
  success_score_distribution: Record<string, number>;
  academic_risk_distribution: Record<string, number>;
  placement_risk_distribution: Record<string, number>;
  segment_distribution: Record<string, number>;
}
export interface Overview extends Distribution {
  total_students: number;
  average_success_score: number | null;
  average_attendance: number | null;
  average_engagement_index: number | null;
  applied_filters: Record<string, JsonValue>;
}
export interface Trends {
  success_score_trends: Record<string, number>;
  attendance_trends: Record<string, number>;
  engagement_trends: Record<string, number>;
}
export interface Student {
  student_id: string;
  department: string;
  year: number;
  semester: number;
  section: string;
  academic_year: string;
}
interface Period {
  student_id: string;
  semester: number;
  academic_year: string;
}
export interface Student360 {
  student: Student;
  academic_history: (Period & {
    cgpa: number;
    internal_marks: number;
    backlogs: number;
    subject_performance: Record<string, JsonValue> | null;
  })[];
  attendance_history: (Period & {
    overall_attendance: number;
    subject_attendance: Record<string, JsonValue> | null;
  })[];
  lms_history: (Period & {
    login_frequency: number;
    assignment_completion: number;
  })[];
  engagement_history: (Period & {
    events_count: number;
    clubs_count: number;
    hackathons_count: number;
    certifications_count: number;
  })[];
  placement_information: {
    student_id: string;
    assessment_date: string;
    aptitude_score: number;
    coding_score: number;
    mock_interview_score: number;
    placement_participation: boolean;
  }[];
  skills_information: {
    student_id: string;
    assessment_date: string;
    technical_skill_score: number;
    soft_skill_score: number;
  }[];
  feedback_history: (Period & {
    student_satisfaction: number;
    faculty_feedback: JsonValue;
  })[];
}
export interface SuccessScore {
  student_id: string;
  success_score: number;
  band: string;
  domain_scores: Record<string, number>;
  available_domains: string[];
  missing_domains: string[];
}
interface Risk {
  student_id: string;
  risk_level: string;
  available_signals: string[];
  missing_signals: string[];
}
export interface AcademicRisk extends Risk {
  academic_risk_score: number;
  assessment_period: { semester: number; academic_year: string } | null;
}
export interface PlacementRisk extends Risk {
  placement_risk_score: number;
  assessment_metadata: {
    placement_assessment_date: string | null;
    skills_assessment_date: string | null;
  };
}
export interface Contributor {
  name: string;
  status: string;
  excluded_from_calculation: boolean;
  configured_weight: number;
  effective_weight: number;
  normalized_value: number | null;
}
export interface DomainContributor extends Contributor {
  contribution: number | null;
  direction: string;
}
export interface RiskDriver extends Contributor {
  risk_contribution: number | null;
}
export interface RiskExplanation {
  score: number;
  risk_level: string;
  drivers: RiskDriver[];
  protective_indicators: RiskDriver[];
  missing_signals: string[];
}
export interface Explanation {
  student_id: string;
  success_score: {
    score: number;
    band: string;
    contributors: DomainContributor[];
    missing_domains: string[];
  };
  academic_risk: RiskExplanation & {
    assessment_period: AcademicRisk["assessment_period"];
  };
  placement_risk: RiskExplanation & {
    assessment_metadata: PlacementRisk["assessment_metadata"];
  };
}
export interface SegmentSummary {
  segment_id: string;
  name: string;
  description: string;
  student_count: number;
  percentage_of_population: number;
  criteria: string;
}
export interface SegmentList {
  total_students: number;
  segments: SegmentSummary[];
}
export interface SegmentDetail extends SegmentSummary {
  characteristics: {
    average_success_score: number | null;
    average_academic_risk: number | null;
    average_placement_risk: number | null;
    average_cgpa: number | null;
    average_attendance: number | null;
    average_lms_activity: number | null;
    average_aptitude_score: number | null;
    average_coding_score: number | null;
  };
  students: string[];
}
export interface Membership {
  student_id: string;
  primary_segment: string | null;
  secondary_segments: string[];
}
export interface Insight {
  insight_id: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  metric_value: number | null;
  comparison_value: number | null;
  unit: string | null;
  supporting_metrics: { name: string; value: JsonValue; unit: string | null }[];
  trend_data: { period: string; metric: string; value: number }[];
  insufficient_sample: boolean;
}
export interface Insights {
  generated_at: string;
  applied_filters: Record<string, JsonValue>;
  population_size: number;
  insights: Insight[];
}
export interface Provenance {
  dataset_id: string;
  source_name: string;
  reference: string;
  license: string;
  acquisition_date: string;
  authenticity: string;
  domains: string[];
  verification_status: string;
}
export interface Sources {
  mappings: Record<
    string,
    Record<
      string,
      {
        canonical_field: string;
        transformation: string;
        validation: string;
        verification_status: string;
      }
    >
  >;
  rules: string[];
}
export interface Registry {
  datasets: Record<
    string,
    {
      dataset_id: string;
      name: string;
      status: string;
      source_type: string;
      description: string;
      authenticity: string;
      reference: string;
      license: string;
      acquisition_date: string;
      domains_covered: string[];
      notes: string[];
      verification_status: string;
    }
  >;
}
export interface Quality {
  dataset_id: string;
  run_time: string;
  domains: Record<
    string,
    {
      records_processed: number;
      records_accepted: number;
      records_rejected: number;
      missing_values: number;
      duplicate_records: number;
      schema_errors: number;
      invalid_ranges: number;
    }
  >;
}
