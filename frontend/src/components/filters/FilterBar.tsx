import { useState, useEffect, type FormEvent } from "react";
import { SlidersHorizontal, RotateCcw, Check } from "lucide-react";
import { useFilters } from "@/hooks/useFilters";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export function FilterBar({
  scope = "cohort",
}: {
  scope?: "cohort" | "institution" | "student";
}) {
  const { filters, setFilters, filtered } = useFilters();
  
  const [department, setDepartment] = useState(filters.department ?? "");
  const [year, setYear] = useState<number | "">(filters.year ?? "");
  const [semester, setSemester] = useState<number | "">(filters.semester ?? "");

  // Sync local state when URL filters change
  useEffect(() => {
    setDepartment(filters.department ?? "");
    setYear(filters.year ?? "");
    setSemester(filters.semester ?? "");
  }, [filters]);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: ({ signal }) => api.departments(signal),
    staleTime: Infinity,
  });

  function handleYearChange(newYearStr: string) {
    const newYear = newYearStr ? parseInt(newYearStr, 10) : "";
    setYear(newYear);
    
    // When year changes, validate semester
    if (newYear === "") {
      setSemester("");
    } else if (semester !== "") {
      const sem = parseInt(String(semester), 10);
      if (sem !== newYear * 2 - 1 && sem !== newYear * 2) {
        setSemester("");
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      department: department || undefined,
      year: year !== "" ? year : undefined,
      semester: semester !== "" ? semester : undefined,
    });
  }

  return (
    <section className="filter-section" aria-label="Cohort filters">
      <form className="filter-bar" onSubmit={submit}>
        <div className="filter-title">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span>Your cohort</span>
        </div>
        <label className="filter-field department-field">
          <span>Department</span>
          <SelectNative
            name="department"
            aria-label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All departments</option>
            {Array.isArray(departments) && departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectNative>
        </label>
        <label className="filter-field">
          <span>Year</span>
          <SelectNative
            aria-label="Year"
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
          >
            <option value="">All years</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                Year {n}
              </option>
            ))}
          </SelectNative>
        </label>
        <label className="filter-field">
          <span>Semester</span>
          <SelectNative
            aria-label="Semester"
            value={semester}
            disabled={year === ""}
            onChange={(e) => setSemester(e.target.value ? parseInt(e.target.value, 10) : "")}
          >
            {year === "" ? (
              <option value="">Select a year first</option>
            ) : (
              <option value="">All semesters</option>
            )}
            {year !== "" && [year * 2 - 1, year * 2].map((n) => (
              <option key={n} value={n}>
                Semester {n}
              </option>
            ))}
          </SelectNative>
        </label>
        <Button type="submit" variant="secondary">
          <Check size={14} aria-hidden="true" />
          Apply Filters
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Reset filters"
          onClick={() => {
            setDepartment("");
            setYear("");
            setSemester("");
            setFilters({});
          }}
          disabled={!filtered && !department && year === "" && semester === ""}
        >
          <RotateCcw size={15} />
          <span>Reset</span>
        </Button>
      </form>
      <div className="filter-context" role="status">
        {scope === "institution"
          ? "Institution-wide data · cohort filters are preserved for analytics pages."
          : scope === "student"
            ? "Individual student record · cohort filters are preserved for your return."
            : filtered
              ? `Viewing ${[filters.department, filters.year && `Year ${filters.year}`, filters.semester && `Semester ${filters.semester}`].filter(Boolean).join(" · ")}`
              : "All departments · All years · All semesters"}
      </div>
    </section>
  );
}
