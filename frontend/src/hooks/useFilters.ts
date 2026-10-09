import { useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { filterParams, readFilters } from "@/utils/data";
import type { Filters } from "@/types/api";
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const latestParams = useRef(params);
  useEffect(() => {
    latestParams.current = params;
  }, [params]);
  const setFilters = (change: Filters | ((current: Filters) => Filters)) => {
    // Router transitions can defer rendering between rapid control changes.
    // Merge against the last requested URL, including changes not yet rendered.
    const next =
      typeof change === "function"
        ? change(readFilters(latestParams.current))
        : change;
    const updated = new URLSearchParams(latestParams.current);
    for (const key of ["department", "year", "semester", "page", "offset"])
      updated.delete(key);
    filterParams(next).forEach((v, k) => updated.set(k, v));
    latestParams.current = updated;
    setParams(updated);
  };
  const cohortSearch = filterParams(filters).toString();
  return {
    filters,
    setFilters,
    cohortSearch: cohortSearch ? `?${cohortSearch}` : "",
    filtered: Object.keys(filters).length > 0,
  };
}
