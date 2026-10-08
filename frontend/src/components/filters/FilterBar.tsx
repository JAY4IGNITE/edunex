import { useState, type FormEvent } from "react";
import { SlidersHorizontal, RotateCcw, Check } from "lucide-react";
import { useFilters } from "@/hooks/useFilters";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { readFilters } from "@/utils/data";
export function FilterBar({
  scope = "cohort",
}: {
  scope?: "cohort" | "institution" | "student";
}) {
  const { filters, setFilters, filtered } = useFilters();
  const [department, setDepartment] = useState(filters.department ?? "");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      department: department.trim() || undefined,
    }));
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
          <input
            name="department"
            placeholder="All departments"
            aria-label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </label>
        <label className="filter-field">
          <span>Year</span>
          <SelectNative
            aria-label="Year"
            value={filters.year ?? ""}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                year: readFilters(new URLSearchParams({ year: e.target.value }))
                  .year,
              }))
            }
          >
            <option value="">All years</option>
            {[1, 2, 3, 4, 5].map((n) => (
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
            value={filters.semester ?? ""}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                semester: readFilters(
                  new URLSearchParams({ semester: e.target.value }),
                ).semester,
              }))
            }
          >
            <option value="">All semesters</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Semester {n}
              </option>
            ))}
          </SelectNative>
        </label>
        <Button type="submit" variant="secondary">
          <Check size={14} aria-hidden="true" />
          Apply department
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-label="Reset filters"
          onClick={() => {
            setDepartment("");
            setFilters({});
          }}
          disabled={!filtered && !department}
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
        {scope === "cohort" && (
          <span>Department matches the recorded name exactly.</span>
        )}
      </div>
    </section>
  );
}
