import { Evidence } from "./Evidence";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supportApi, type Intervention, type InterventionStatus } from "@/services/api/support";
import "./support.css";

export function InterventionCard({ record }: { record: Intervention }) {
  const client = useQueryClient();
  const [assignee, setAssignee] = useState(record.assignee ?? "faculty-demo");
  const [due, setDue] = useState(record.due_date ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [notes, setNotes] = useState(record.notes);
  const [reason, setReason] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const audit = useQuery({ queryKey: ["intervention-audit", record.id, record.version], queryFn: () => supportApi.audit(record.id), enabled: auditOpen });
  const mutation = useMutation({
    mutationFn: (status: InterventionStatus) => supportApi.update(record.id, {
      version: record.version, status, notes,
      ...(status === "Assigned" ? {assignee, due_date: due} : {}),
      ...(status === "Dismissed" ? {dismissal_reason: reason.trim()} : {}),
    }),
    onSuccess: async () => {
      await Promise.all(["interventions", "priority", "support-kpis"].map(key => client.invalidateQueries({queryKey:[key]})));
    },
  });
  const active = !["Completed", "Dismissed"].includes(record.status);
  const next = {Recommended: "Assigned", Assigned: "In Progress", "In Progress": "Completed"}[record.status as "Recommended" | "Assigned" | "In Progress"] as InterventionStatus | undefined;
  return <article className="panel support-card">
    <div className="support-card-heading"><Link className="text-link" to={`/students/${encodeURIComponent(record.student_id)}`}>{record.student_id}</Link><span className="support-status">{record.status}</span></div>
    <h3>{record.recommendation.action}</h3><p>{record.recommendation.rationale}</p>
    <Evidence values={record.recommendation.evidence} />
    <p className="scope-note">Suggested owner: {record.recommendation.owner_role} · {record.recommendation.urgency} urgency</p>
    {record.assignee && <p>Assigned to {record.assignee} · Due {record.due_date}</p>}
    {active && <form onSubmit={event => {event.preventDefault(); if(next) mutation.mutate(next);}}>
      {record.status === "Recommended" && <div className="support-fields"><label>Demo assignee<select value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="faculty-demo">Demo Faculty</option><option value="mentor-demo">Demo Mentor</option><option value="counselor-demo">Demo Counselor</option><option value="placement-demo">Demo Placement Officer</option></select></label><label>Due date<input type="date" required value={due} onChange={e=>setDue(e.target.value)} /></label></div>}
      <label>Notes (synthetic demo only)<textarea maxLength={4000} value={notes} onChange={e=>setNotes(e.target.value)} /></label>
      <div className="support-actions"><Button type="submit" disabled={mutation.isPending}>{record.status === "Recommended" ? "Assign" : record.status === "Assigned" ? "Start" : "Complete"}</Button></div>
      <div className="support-dismiss"><label>Reason for dismissal<input maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} /></label><Button type="button" variant="outline" disabled={!reason.trim() || mutation.isPending} onClick={()=>mutation.mutate("Dismissed")}>Dismiss</Button></div>
    </form>}
    {!active && record.notes && <p>Notes: {record.notes}</p>}
    {record.dismissal_reason && <p>Dismissal reason: {record.dismissal_reason}</p>}
    {record.outcome && <p role="status">{record.outcome.note}{record.outcome.score_change !== null && ` Score change: ${record.outcome.score_change.toFixed(2)} points.`}</p>}
    {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    <details onToggle={e=>setAuditOpen(e.currentTarget.open)}><summary>Audit trail</summary>{audit.isPending ? <p>Loading history…</p> : audit.isError ? <p role="alert">Unable to load history.</p> : <ol>{audit.data.items.map(item=><li key={item.id}>{item.event} · {item.actor} · {new Date(item.created_at).toLocaleString()}</li>)}</ol>}</details>
  </article>;
}
