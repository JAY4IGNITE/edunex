import type { JsonValue, Student360 } from "@/types/api";
import { displayValue, humanize } from "@/utils/data";
import { SectionHeading } from "@/components/cards/Shared";
const domains = [
  ["Academic", "academic_history"],
  ["Attendance", "attendance_history"],
  ["LMS", "lms_history"],
  ["Engagement", "engagement_history"],
  ["Placement", "placement_information"],
  ["Skills", "skills_information"],
  ["Feedback", "feedback_history"],
] as const;
export function DomainHistory({ student }: { student: Student360 }) {
  return (
    <section className="panel domain-history">
      <SectionHeading
        title="The complete student record"
        description="Explore the available source records across seven domains."
      />
      {domains.map(([label, key]) => {
        const records = student[key];
        const columns = records.length
          ? Object.keys(records[0]).filter((k) => k !== "student_id")
          : [];
        return (
          <details key={key}>
            <summary>
              <span>{label}</span>
              <small>{records.length} records</small>
            </summary>
            {records.length ? (
              <div
                className="table-scroll"
                role="region"
                aria-label={`${label} history`}
                tabIndex={0}
              >
                <table>
                  <caption className="sr-only">{label} history</caption>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column}>{humanize(column)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, i) => (
                      <tr key={i}>
                        {columns.map((column) => (
                          <td key={column}>
                            {displayValue(
                              (record as unknown as Record<string, JsonValue>)[
                                column
                              ] ?? null,
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="paragraph-small muted">
                No {label.toLowerCase()} records available.
              </p>
            )}
          </details>
        );
      })}
    </section>
  );
}
