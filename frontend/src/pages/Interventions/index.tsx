import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { PageHeading } from "@/components/cards/Shared";
import { PageSkeleton } from "@/components/skeletons";
import { EmptyState, ErrorState } from "@/components/states/States";
import { Button } from "@/components/ui/button";
import { InterventionCard } from "@/components/interventions/InterventionCard";
import { supportApi } from "@/services/api/support";

export default function Interventions() {
  const [params,setParams]=useSearchParams();
  const offset=Math.max(0,Number(params.get("offset"))||0);
  const request=new URLSearchParams(params); request.set("offset",String(offset));request.set("limit","10");
  const query=useQuery({queryKey:["interventions",request.toString()],queryFn:({signal})=>supportApi.interventions(request,signal)});
  function change(key:string,value:string){const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);if(key!=="offset")next.delete("offset");setParams(next);}
  return <><PageHeading eyebrow="From insight to action" title="Interventions" description="Assign, follow up, and record outcomes with a complete audit trail." /><p className="scope-note">Demonstration Institutional Dataset · Synthetic actions and students. Score changes require later observations and do not establish causation.</p>
    <div className="support-filters"><label>Status<select value={params.get("status")??""} onChange={e=>change("status",e.target.value)}><option value="">All statuses</option>{["Recommended","Assigned","In Progress","Completed","Dismissed"].map(s=><option key={s}>{s}</option>)}</select></label><label>Assignee<select value={params.get("assignee")??""} onChange={e=>change("assignee",e.target.value)}><option value="">All demo staff</option>{["faculty-demo","mentor-demo","counselor-demo","placement-demo"].map(s=><option key={s}>{s}</option>)}</select></label></div>
    {query.isPending?<PageSkeleton />:query.isError?<ErrorState message="Unable to load interventions." retry={()=>void query.refetch()} />:<>{query.data.items.length?<div className="support-grid">{query.data.items.map(record=><InterventionCard key={`${record.id}:${record.version}`} record={record} />)}</div>:<EmptyState title="No interventions match these filters." description="Open a priority student and review a recommendation to begin." />}<div className="support-pagination"><span>{query.data.total} matching interventions</span><Button variant="outline" disabled={offset===0} onClick={()=>change("offset",String(Math.max(0,offset-10)))}>Previous</Button><Button variant="outline" disabled={offset+10>=query.data.total} onClick={()=>change("offset",String(offset+10))}>Next</Button></div></>}
  </>;
}
