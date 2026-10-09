import { get, mutate } from "./client";
import type { Student } from "@/types/api";

export type InterventionStatus = "Recommended" | "Assigned" | "In Progress" | "Completed" | "Dismissed";
export interface Recommendation {
  key: string; risk_type: string; action: string; rationale: string;
  evidence: Record<string, number | boolean | Record<string, number>>; driver_keys: string[];
  owner_role: string; urgency: string; suggested_days: number; expected_impact: string;
}
export interface Analysis {
  student: Student; recommendations: Recommendation[]; segments: string[];
  success_score: {score: number; band: string; missing_domains: string[]} | null;
  academic_risk: {score: number; risk_level: string; missing_signals: string[]} | null;
  placement_risk: {score: number; risk_level: string; missing_signals: string[]} | null;
  priority_breakdown: {priority: number; severity: number; decline_multiplier: number; unaddressed_drivers: number; trend_available: boolean};
  assignees: Record<string, string>; provenance: string;
}
export interface Intervention {
  id: number; student_id: string; recommendation_key: string; recommendation: Recommendation;
  status: InterventionStatus; assignee: string | null; due_date: string | null; notes: string;
  dismissal_reason: string | null; version: number; created_at: string; completed_at: string | null;
  outcome: {follow_up_available: boolean; score_change: number | null; note: string} | null;
}
export interface Page<T> {items: T[]; total: number; offset: number; limit: number; provenance: string; formula?: string}
export const supportApi = {
  priority: (params: URLSearchParams, signal?: AbortSignal) => get<Page<Analysis>>("/priority", params, signal),
  recommendations: (id: string, signal?: AbortSignal) => get<Analysis>(`/students/${encodeURIComponent(id)}/recommendations`, undefined, signal),
  interventions: (params: URLSearchParams, signal?: AbortSignal) => get<Page<Intervention>>("/interventions", params, signal),
  create: (student_id: string, recommendation_key: string) => mutate<Intervention>("/interventions", "POST", {student_id, recommendation_key}),
  update: (id: number, changes: {version: number; status?: InterventionStatus; assignee?: string; due_date?: string; notes?: string; dismissal_reason?: string}) => mutate<Intervention>(`/interventions/${id}`, "PATCH", changes),
  audit: (id: number) => get<{items: {id: number; actor: string; event: string; created_at: string}[]; total: number}>(`/interventions/${id}/audit`),
};
