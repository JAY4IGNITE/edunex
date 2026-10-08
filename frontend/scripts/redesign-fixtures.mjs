// Browser-only contract fixtures. These are layout inputs, not analytical evidence.
import { readFile } from "node:fs/promises";
import { overview, trends, detail } from "./browser-fixtures.mjs";

const segmentNames = [
  ["HIGH_ACADEMIC_HIGH_PLACEMENT", "High academic & placement readiness"],
  ["HIGH_ACADEMIC_LOW_PLACEMENT", "Strong academics, developing readiness"],
  ["LOW_ACADEMIC_HIGH_PLACEMENT", "Developing academics, strong readiness"],
  ["LOW_ACADEMIC_LOW_PLACEMENT", "Academic & placement support"],
  ["HIGH_ENGAGEMENT_LOW_ACADEMIC", "Engaged, developing academics"],
  ["LOW_ENGAGEMENT_LOW_ACADEMIC", "Academic & engagement support"],
];
const segments = segmentNames.map(([segment_id, name], index) => ({
  segment_id,
  name,
  description:
    "A descriptive grouping based on available academic, placement, and engagement signals.",
  student_count: [32, 18, 14, 16, 11, 9][index],
  percentage_of_population: [32, 18, 14, 16, 11, 9][index],
  criteria: "Backend-configured analytical signals determine membership.",
}));
export const students = Array.from({ length: 21 }, (_, index) => ({
  student_id: `TEST${String(index + 1).padStart(4, "0")}`,
  department: "Computer Science",
  year: 2,
  semester: 4,
  section: ["A", "B", "C"][index % 3],
  academic_year: "2024-2025",
}));
const domainScores = {
  academic: 76,
  attendance: 84,
  lms: 70,
  engagement: 60,
  placement: 68,
  skills: 72,
  feedback: 80,
};
const contributors = Object.entries(domainScores).map(
  ([name, normalized_value], index) => ({
    name,
    normalized_value,
    status: "available",
    excluded_from_calculation: false,
    configured_weight: [0.25, 0.15, 0.15, 0.1, 0.2, 0.1, 0.05][index],
    effective_weight: [0.25, 0.15, 0.15, 0.1, 0.2, 0.1, 0.05][index],
    contribution: [19, 12.6, 10.5, 6, 13.6, 7.2, 4][index],
    direction: "positive",
  }),
);
const riskDriver = {
  name: "coding_score",
  status: "available",
  excluded_from_calculation: false,
  configured_weight: 0.25,
  effective_weight: 0.25,
  normalized_value: 44,
  risk_contribution: 11,
};
const riskExplanation = {
  score: 35,
  risk_level: "MEDIUM",
  drivers: [riskDriver],
  protective_indicators: [
    {
      ...riskDriver,
      name: "aptitude_score",
      normalized_value: 15,
      risk_contribution: 3,
    },
  ],
  missing_signals: [],
};
const assessment_period = { semester: 4, academic_year: "2024-2025" };
const assessment_metadata = {
  placement_assessment_date: "2026-09-25",
  skills_assessment_date: "2026-09-25",
};
const domainKeys = [
  "academic_records",
  "attendance_records",
  "lms_records",
  "engagement_records",
  "placement_records",
  "skill_records",
  "feedback_records",
];
const provenance = JSON.parse(
  await readFile(
    new URL("../../data/processed/provenance.json", import.meta.url),
    "utf8",
  ),
);
const quality = JSON.parse(
  await readFile(
    new URL("../../data/processed/quality_report.json", import.meta.url),
    "utf8",
  ),
);
const populatedInsights = {
  generated_at: "2026-10-08T00:00:00Z",
  applied_filters: {},
  population_size: 100,
  insights: [
    [
      "ACADEMIC",
      "Academic Risk",
      "HIGH",
      "Academic support needs attention",
      "10 students in this cohort have a high academic risk classification.",
      10,
      null,
      "students",
    ],
    [
      "PLACEMENT",
      "Placement Risk",
      "HIGH",
      "Placement readiness varies across the cohort",
      "15 students have a high placement risk classification based on their available readiness signals.",
      15,
      null,
      "students",
    ],
    [
      "SUCCESS",
      "Student Success",
      "MEDIUM",
      "Success scores provide a shared starting point",
      "The cohort average success score is 72.5 from available analytical domains.",
      72.5,
      69.2,
      "score",
    ],
    [
      "ENGAGEMENT",
      "Engagement",
      "LOW",
      "Engagement is available across four semesters",
      "The recorded cohort engagement index reaches 3.2 in the latest available period.",
      3.2,
      2.7,
      "index",
    ],
  ].map(
    ([
      insight_id,
      category,
      priority,
      title,
      description,
      metric_value,
      comparison_value,
      unit,
    ]) => ({
      insight_id,
      category,
      priority,
      title,
      description,
      metric_value,
      comparison_value,
      unit,
      supporting_metrics: [
        { name: "Cohort population", value: 100, unit: "students" },
      ],
      trend_data: [],
      insufficient_sample: false,
    }),
  ),
};

export async function installRedesignFixtures(page, observedRequests = []) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (!path.startsWith("/api/")) return route.continue();
    observedRequests.push(`${path}${url.search}`);
    const distribution = {
      ...overview,
      segment_distribution: Object.fromEntries(
        segments.map((s) => [s.segment_id, s.student_count]),
      ),
    };
    const fixed = {
      "/api/analytics/overview": distribution,
      "/api/analytics/distribution": distribution,
      "/api/analytics/trends": trends,
      "/api/insights": populatedInsights,
      "/api/segments": { total_students: 100, segments },
      "/api/data/provenance": provenance,
      "/api/data/quality": quality,
      "/api/data/sources": {
        mappings: {
          campuspulse_demo: {
            student_id: {
              canonical_field: "student_id",
              transformation: "none",
              validation: "must_be_string",
              verification_status: "VERIFIED",
            },
          },
        },
        rules: ["Only verified mappings enter the canonical dataset."],
      },
      "/api/data/schema": {
        datasets: {
          campuspulse_demo: {
            dataset_id: "campuspulse_demo",
            name: "CampusPulse Demonstration Dataset",
            status: "planned",
            source_type: "demonstration_institutional_dataset",
            description:
              "Coherent demonstration dataset covering all seven required domains.",
            authenticity: provenance.authenticity,
            reference: "Synthetically generated locally",
            license: provenance.license,
            acquisition_date: provenance.acquisition_date,
            domains_covered: provenance.domains,
            notes: ["Demonstration data is not real institutional data."],
            verification_status: "VERIFIED",
          },
        },
      },
    };
    if (fixed[path]) return route.fulfill({ json: fixed[path] });
    if (path === "/api/students") {
      const start = Number(url.searchParams.get("skip") ?? 0);
      const count = Number(url.searchParams.get("limit") ?? 10);
      const empty = url.searchParams.get("department")?.startsWith("NoSuch");
      return route.fulfill({
        json: empty ? [] : students.slice(start, start + count),
      });
    }
    if (path.startsWith("/api/segments/student/"))
      return route.fulfill({
        json: {
          student_id: path.split("/").at(-1),
          primary_segment: segments[1].segment_id,
          secondary_segments: [],
        },
      });
    if (path.startsWith("/api/segments/")) {
      const segment = segments.find((s) => path.endsWith(s.segment_id));
      if (segment)
        return route.fulfill({
          json: {
            ...detail,
            ...segment,
            students: students.map((s) => s.student_id),
          },
        });
    }
    const match = path.match(/^\/api\/students\/([^/]+)(?:\/(.*))?$/);
    if (match) {
      const [, student_id, resource] = match;
      const student = students.find((s) => s.student_id === student_id);
      if (!student)
        return route.fulfill({
          status: 404,
          json: { detail: "Student not found" },
        });
      const period = { student_id, ...assessment_period };
      const risk = {
        student_id,
        available_signals: ["coding_score", "aptitude_score"],
        missing_signals: [],
      };
      const index = students.indexOf(student);
      const academicLevel = index % 3 === 0 ? "HIGH" : "LOW";
      const resources = {
        "ai-prediction": {
          status: "error",
          reason: "Additional semester history is required for this model.",
        },
        "success-score": {
          student_id,
          success_score: 72.9,
          band: "Good",
          domain_scores: domainScores,
          available_domains: Object.keys(domainScores),
          missing_domains: [],
        },
        "academic-risk": {
          ...risk,
          academic_risk_score: 18,
          risk_level: "LOW",
          assessment_period,
        },
        "placement-risk": {
          ...risk,
          placement_risk_score: 35,
          risk_level: "MEDIUM",
          assessment_metadata,
        },
        explanation: {
          student_id,
          success_score: {
            score: 72.9,
            band: "Good",
            contributors,
            missing_domains: [],
          },
          academic_risk: {
            ...riskExplanation,
            score: index % 3 === 0 ? 65 : 18,
            risk_level: academicLevel,
            assessment_period,
          },
          placement_risk: { ...riskExplanation, assessment_metadata },
        },
      };
      if (resource && resources[resource])
        return route.fulfill({ json: resources[resource] });
      if (!resource)
        return route.fulfill({
          json: {
            student,
            academic_history: [1, 2, 3, 4].map((semester) => ({
              ...period,
              semester,
              cgpa: 7.6,
              internal_marks: 76,
              backlogs: 0,
              subject_performance: { Mathematics: 82, Computing: 76 },
            })),
            attendance_history: [
              { ...period, overall_attendance: 84, subject_attendance: null },
            ],
            lms_history: [
              { ...period, login_frequency: 26, assignment_completion: 70 },
            ],
            engagement_history: [
              {
                ...period,
                events_count: 3,
                clubs_count: 1,
                hackathons_count: 1,
                certifications_count: 1,
              },
            ],
            placement_information: [
              {
                student_id,
                assessment_date: "2026-09-25",
                aptitude_score: 85,
                coding_score: 56,
                mock_interview_score: 72,
                placement_participation: true,
              },
            ],
            skills_information: [
              {
                student_id,
                assessment_date: "2026-09-25",
                technical_skill_score: 72,
                soft_skill_score: 80,
              },
            ],
            feedback_history: [
              {
                ...period,
                student_satisfaction: 4,
                faculty_feedback: "Consistent participation in class.",
              },
            ],
          },
        });
    }
    throw new Error(`Uncovered browser fixture: ${path}`);
  });
}
