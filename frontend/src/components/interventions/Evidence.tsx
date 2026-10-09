import type { Recommendation } from "@/services/api/support";

export function Evidence({ values }: { values: Recommendation["evidence"] }) {
  return <dl className="support-evidence">{Object.entries(values).map(([key,value]) => <div key={key}>
    <dt>{key.replaceAll("_", " ")}</dt>
    <dd>{typeof value === "object" ? Object.entries(value).map(([subject,score])=>`${subject}: ${score}`).join(" · ") : String(value)}</dd>
  </div>)}</dl>;
}
