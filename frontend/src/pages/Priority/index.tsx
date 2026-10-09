import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeading, RiskBadge } from "@/components/cards/Shared";
import { PageSkeleton } from "@/components/skeletons";
import { EmptyState, ErrorState } from "@/components/states/States";
import { Button } from "@/components/ui/button";
import { supportApi } from "@/services/api/support";
import "@/components/interventions/support.css";

export default function Priority() {
  const [params,setParams] = useSearchParams();
  const offset = Math.max(0,Number(params.get("offset")) || 0);
  const request = new URLSearchParams(params); request.set("limit","25"); request.set("offset",String(offset));
  const query = useQuery({queryKey:["priority",request.toString()], queryFn:({signal})=>supportApi.priority(request,signal)});
  function change(key:string,value:string) {const next=new URLSearchParams(params); value ? next.set(key,value) : next.delete(key); if(key!=="offset") next.delete("offset"); setParams(next);}
  return <><PageHeading eyebrow="Human-reviewed support" title="Priority Students" description="Find students who may benefit from timely support, review the evidence, and assign the next step." />
    <p className="scope-note">Demonstration Institutional Dataset · Synthetic students. MEDIUM and HIGH risks are included. Priority is a planning score, not a predicted treatment effect.</p>
    <div className="support-filters"><label>Risk type<select value={params.get("risk_type")??""} onChange={e=>change("risk_type",e.target.value)}><option value="">All risks</option><option value="academic">Academic</option><option value="placement">Placement</option></select></label><label>Cohort segment<select value={params.get("segment")??""} onChange={e=>change("segment",e.target.value)}><option value="">All segments</option>{["HIGH_ACADEMIC_LOW_PLACEMENT","LOW_ACADEMIC_HIGH_PLACEMENT","HIGH_ENGAGEMENT_LOW_ACADEMIC","LOW_ENGAGEMENT_LOW_ACADEMIC","HIGH_ACADEMIC_HIGH_PLACEMENT","LOW_ACADEMIC_LOW_PLACEMENT"].map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label></div>
    {query.isPending ? <PageSkeleton /> : query.isError ? <ErrorState message="Unable to load the priority queue." retry={()=>void query.refetch()} /> : <>
      <details className="panel support-formula"><summary>How students are prioritized</summary><p>{query.data.formula}</p><p>Only available drivers count. Assigned or in-progress actions address their linked drivers. Missing academic history uses a neutral decline multiplier. Equal priorities are ordered by student ID.</p></details>
      {!query.data.items.length ? <EmptyState title="No priority students match these filters." /> : <div className="panel support-table-wrap"><table className="support-table"><thead><tr><th>Student</th><th>Academic risk</th><th>Placement risk</th><th>Priority</th><th>Unaddressed drivers</th><th>Next step</th></tr></thead><tbody>{query.data.items.map(row=><tr key={row.student.student_id}><td><Link className="text-link" to={`/students/${encodeURIComponent(row.student.student_id)}`}>{row.student.student_id}</Link><p className="scope-note">{row.student.department} · Semester {row.student.semester}</p></td><td>{row.academic_risk ? <RiskBadge level={row.academic_risk.risk_level} /> : "Unavailable"}</td><td>{row.placement_risk ? <RiskBadge level={row.placement_risk.risk_level} /> : "Unavailable"}</td><td>{row.priority_breakdown.priority.toFixed(2)}</td><td>{row.priority_breakdown.unaddressed_drivers}</td><td><Link className="text-link" to={`/students/${encodeURIComponent(row.student.student_id)}#recommendations-title`}>Review recommendations</Link></td></tr>)}</tbody></table></div>}
      <div className="support-pagination"><span>{query.data.total} matching students</span><Button variant="outline" disabled={offset===0} onClick={()=>change("offset",String(Math.max(0,offset-25)))}>Previous</Button><Button variant="outline" disabled={offset+25>=query.data.total} onClick={()=>change("offset",String(offset+25))}>Next</Button></div>
    </>}
  </>;
}
