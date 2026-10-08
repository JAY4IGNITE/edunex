import { get } from "./client";
import { filterParams } from "@/utils/data";
import type {
  AcademicRisk,
  Distribution,
  Explanation,
  Filters,
  Insights,
  Membership,
  Overview,
  PlacementRisk,
  Provenance,
  Quality,
  Registry,
  SegmentDetail,
  SegmentList,
  Sources,
  Student,
  Student360,
  SuccessScore,
  Trends,
  AIPrediction,
} from "@/types/api";
const studentPath = (id: string) => `/students/${encodeURIComponent(id)}`;
export const api = {
  overview: (filters: Filters, signal?: AbortSignal) =>
    get<Overview>("/analytics/overview", filterParams(filters), signal),
  distribution: (filters: Filters, signal?: AbortSignal) =>
    get<Distribution>("/analytics/distribution", filterParams(filters), signal),
  trends: (filters: Filters, signal?: AbortSignal) =>
    get<Trends>("/analytics/trends", filterParams(filters), signal),
  insights: (filters: Filters, signal?: AbortSignal) =>
    get<Insights>("/insights", filterParams(filters), signal),
  students: (filters: Filters, page: number, signal?: AbortSignal) => {
    const params = filterParams(filters);
    params.set("skip", String(page * 10));
    params.set("limit", "10");
    return get<Student[]>("/students", params, signal);
  },
  student: (id: string, signal?: AbortSignal) =>
    get<Student360>(studentPath(id), undefined, signal),
  score: (id: string, signal?: AbortSignal) =>
    get<SuccessScore>(`${studentPath(id)}/success-score`, undefined, signal),
  academicRisk: (id: string, signal?: AbortSignal) =>
    get<AcademicRisk>(`${studentPath(id)}/academic-risk`, undefined, signal),
  aiPrediction: (id: string, signal?: AbortSignal) =>
    get<AIPrediction>(`${studentPath(id)}/ai-prediction`, undefined, signal),
  placementRisk: (id: string, signal?: AbortSignal) =>
    get<PlacementRisk>(`${studentPath(id)}/placement-risk`, undefined, signal),
  explanation: (id: string, signal?: AbortSignal) =>
    get<Explanation>(`${studentPath(id)}/explanation`, undefined, signal),
  membership: (id: string, signal?: AbortSignal) =>
    get<Membership>(
      `/segments/student/${encodeURIComponent(id)}`,
      undefined,
      signal,
    ),
  segments: (signal?: AbortSignal) =>
    get<SegmentList>("/segments", undefined, signal),
  segment: (id: string, signal?: AbortSignal) =>
    get<SegmentDetail>(
      `/segments/${encodeURIComponent(id)}`,
      undefined,
      signal,
    ),
  sources: (signal?: AbortSignal) =>
    get<Sources>("/data/sources", undefined, signal),
  registry: (signal?: AbortSignal) =>
    get<Registry>("/data/schema", undefined, signal),
  quality: (signal?: AbortSignal) =>
    get<Quality>("/data/quality", undefined, signal),
  provenance: (signal?: AbortSignal) =>
    get<Provenance>("/data/provenance", undefined, signal),
};
