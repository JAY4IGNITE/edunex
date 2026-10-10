import { Evidence } from "./Evidence";
import { useDemoIdentity } from "@/components/auth/DemoAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supportApi } from "@/services/api/support";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/states/States";
import { ChartSkeleton } from "@/components/skeletons";
import { InterventionCard } from "./InterventionCard";

export function RecommendationsPanel({studentId}: {studentId: string}) {
  const identity = useDemoIdentity();
  const canAssign = identity?.role === "admin" || identity?.role === "faculty";
  const client = useQueryClient();
  const recommendations = useQuery({queryKey:["recommendations",studentId], queryFn:({signal})=>supportApi.recommendations(studentId,signal)});
  const interventions = useQuery({queryKey:["interventions",studentId], queryFn:({signal})=>supportApi.interventions(new URLSearchParams({student_id:studentId,limit:"100"}),signal)});
  const create = useMutation({mutationFn:(key:string)=>supportApi.create(studentId,key), onSuccess:()=>client.invalidateQueries({queryKey:["interventions"]})});
  if(recommendations.isPending || interventions.isPending) return <ChartSkeleton />;
  if(recommendations.isError || interventions.isError) return <ErrorState message="Unable to load recommendations." retry={()=>{void recommendations.refetch();void interventions.refetch();}} />;
  const openKeys = new Set(interventions.data.items.filter(i=>!["Completed","Dismissed"].includes(i.status)).map(i=>i.recommendation_key));
  return <section className="support-section" aria-labelledby="recommendations-title"><h2 id="recommendations-title">Recommended interventions</h2>
    <p className="scope-note">{recommendations.data.provenance}. Suggestions require staff review; no action is taken automatically.</p>
    {create.isError && <p role="alert">{create.error.message}</p>}
    <div className="support-grid">{recommendations.data.recommendations.filter(r=>!openKeys.has(r.key)).map(r=><article className="panel support-card" key={r.key}><span className="support-status">{r.urgency} urgency · {r.owner_role}</span><h3>{r.action}</h3><p>{r.rationale}</p><Evidence values={r.evidence} /><p className="scope-note">{r.expected_impact}</p>{canAssign ? <Button disabled={create.isPending} onClick={()=>create.mutate(r.key)}>Review and assign</Button> : <p>Assignment requires Admin or Faculty review.</p>}</article>)}</div>
    {!recommendations.data.recommendations.length && <EmptyState title="No intervention recommended from the available signals." />}
    <div className="support-grid">{interventions.data.items.map(record=><InterventionCard key={`${record.id}:${record.version}`} record={record} />)}</div>
  </section>;
}
