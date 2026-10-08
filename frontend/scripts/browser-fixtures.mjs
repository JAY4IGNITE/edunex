// Isolated browser contract fixtures; never imported by application code.
export const overview = {
  total_students: 100,
  average_success_score: 72.5,
  average_attendance: 81,
  average_engagement_index: 3.2,
  applied_filters: {},
  success_score_distribution: {
    Excellent: 20,
    Good: 45,
    Moderate: 25,
    "Needs Attention": 10,
  },
  academic_risk_distribution: { LOW: 60, MEDIUM: 30, HIGH: 10 },
  placement_risk_distribution: { LOW: 50, MEDIUM: 35, HIGH: 15 },
  segment_distribution: { TEST_SEGMENT: 20 },
};
export const trends = {
  success_score_trends: {
    "Sem-1": 61,
    "Sem-2": 64,
    "Sem-3": 69,
    "Sem-4": 72.5,
  },
  attendance_trends: { "Sem-1": 76, "Sem-2": 78, "Sem-3": 80, "Sem-4": 81 },
  engagement_trends: { "Sem-1": 1.2, "Sem-2": 2.1, "Sem-3": 2.7, "Sem-4": 3.2 },
};
export const segment = {
  segment_id: "TEST_SEGMENT",
  name: "Test analytical segment",
  description:
    "Browser-only fixture used to verify segment characteristics and member navigation.",
  student_count: 21,
  percentage_of_population: 21,
  criteria: "Test-only configured combination.",
};
export const detail = {
  ...segment,
  characteristics: {
    average_success_score: null,
    average_academic_risk: 15,
    average_placement_risk: 20,
    average_cgpa: 8.1,
    average_attendance: 83,
    average_lms_activity: null,
    average_aptitude_score: 78,
    average_coding_score: 75,
  },
  students: Array.from(
    { length: 21 },
    (_, i) => `TEST${String(i + 1).padStart(4, "0")}`,
  ),
};
export const insights = {
  generated_at: "2026-10-08T00:00:00Z",
  applied_filters: {},
  population_size: 100,
  insights: [],
};
