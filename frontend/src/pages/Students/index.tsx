import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { PageHeading } from "@/components/cards/Shared";
import { StudentTable } from "@/components/tables/StudentTable";
import { Button } from "@/components/ui/button";
import { useFilters } from "@/hooks/useFilters";
export default function Students() {
  const [studentId, setStudentId] = useState("");
  const navigate = useNavigate();
  const { cohortSearch } = useFilters();
  return (
    <>
      <PageHeading
        eyebrow="Student explorer"
        title="Students"
        description="Explore individual performance, risk, and analytical segments across your selected cohort."
      />
      <form
        className="student-search-form"
        role="search"
        aria-label="Find a student by ID"
        onSubmit={(event) => {
          event.preventDefault();
          if (studentId.trim())
            navigate(
              `/students/${encodeURIComponent(studentId.trim())}${cohortSearch}`,
            );
        }}
      >
        <div className="student-search-input">
          <Search size={18} aria-hidden="true" />
          <label htmlFor="student-lookup" className="sr-only">
            Student ID
          </label>
          <input
            id="student-lookup"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            placeholder="Find a student by exact ID"
            autoComplete="off"
            aria-describedby="student-search-help"
          />
        </div>
        <Button type="submit" disabled={!studentId.trim()}>
          Open profile <ArrowRight size={16} aria-hidden="true" />
        </Button>
        <p id="student-search-help">
          Open any student by their exact ID, or explore the cohort below.
        </p>
      </form>
      <StudentTable />
      <p className="scope-note table-note">
        Select a student to understand the contributing signals behind their
        score. The directory shows students within your selected cohort.
      </p>
    </>
  );
}
