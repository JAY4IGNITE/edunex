import { PageHeading } from "@/components/cards/Shared";
import { StudentTable } from "@/components/tables/StudentTable";
export default function Students() {
  return (
    <>
      <PageHeading
        eyebrow="Student explorer"
        title="Every student. In perspective."
        description="Explore individual performance, risk, and analytical segments across your selected cohort."
      />
      <StudentTable />
      <p className="scope-note table-note">
        Select a student to understand the contributing signals behind their
        score. Cohort filters are applied by the backend before pagination.
      </p>
    </>
  );
}
