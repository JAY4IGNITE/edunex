import type { Filters, JsonValue, Trends } from "@/types/api";

export function readFilters(params: URLSearchParams): Filters {
  const result: Filters = {};
  const department = params.get("department")?.trim();
  if (department) result.department = department;
  const year = Number(params.get("year"));
  const semester = Number(params.get("semester"));
  if (Number.isInteger(year) && year >= 1 && year <= 5) result.year = year;
  if (Number.isInteger(semester) && semester >= 1 && semester <= 10)
    result.semester = semester;
  return result;
}
export function filterParams(filters: Filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return params;
}
export function trendRows(data: Trends) {
  const periods = new Set([
    ...Object.keys(data.success_score_trends),
    ...Object.keys(data.attendance_trends),
    ...Object.keys(data.engagement_trends),
  ]);
  return [...periods]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((period) => ({
      period,
      success: data.success_score_trends[period] ?? null,
      attendance: data.attendance_trends[period] ?? null,
      engagement: data.engagement_trends[period] ?? null,
    }));
}
export const number = (value: number | null | undefined, digits = 1) =>
  value == null
    ? "Unavailable"
    : new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(
        value,
      );
export const humanize = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bLms\b/g, "LMS")
    .replace(/\bCgpa\b/g, "CGPA");
export const segmentName = (value: string) => humanize(value.toLowerCase());
export function displayValue(value: JsonValue): string {
  if (value === null) return "Unavailable";
  if (typeof value === "number") return number(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  return Object.entries(value)
    .map(([key, val]) => `${humanize(key)}: ${displayValue(val)}`)
    .join(" · ");
}
