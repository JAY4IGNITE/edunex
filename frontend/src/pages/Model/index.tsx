import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api/client";
import { PageHeading } from "@/components/cards/Shared";
import { PageSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/states/States";
import "@/components/interventions/support.css";

interface Metrics {roc_auc:number|null;precision:number;recall:number;f1:number;brier:number;threshold:number;calibration_bins:{lower:number;upper:number;count:number;mean_score:number|null;observed_positive_fraction:number|null}[]}
interface Report {status:string;reason?:string;version:string;provenance:string;target:string;method:string;split_method:string;baseline_note:string;data_sha256:string;limitations:string[];partitions:Record<string,{rows:number;students:number;positives:number;model:Metrics;deterministic_baseline:Metrics;prevalence_baseline:Metrics}>}
const formatted = (value:number|null) => value==null?"Unavailable":value.toFixed(4);

export default function Model() {
  const query=useQuery({queryKey:["model-report"],queryFn:()=>get<Report>("/model")});
  if(query.isPending)return <PageSkeleton />;
  if(query.isError)return <ErrorState message="Unable to load model evidence." retry={()=>void query.refetch()} />;
  const report=query.data;
  if(report.status!=="available")return <><PageHeading eyebrow="Evaluation" title="Model evidence" description={report.reason??"Model unavailable"} /><p>The transparent baseline remains available where student data permits.</p></>;
  const test=report.partitions.test;
  return <><PageHeading eyebrow={`Version ${report.version}`} title="Model evidence" description="Measured synthetic performance, reproducible evaluation, and clear limitations." />
    <p className="scope-note">{report.provenance}. These results do not establish real-world accuracy or intervention effectiveness.</p>
    <section className="panel support-card"><h2>What is being predicted</h2><p>{report.target}</p><p>{report.method}</p><p>{report.split_method}</p><p>Held-out test: {test.rows} rows from {test.students} students, including {test.positives} positive outcomes. Recall at the fixed threshold is {(test.model.recall*100).toFixed(1)}%; staff must also review the transparent baseline drivers.</p></section>
    <section className="panel support-card"><h2>Held-out test results</h2><div className="support-table-wrap"><table className="support-table"><caption>Model compared with the existing rules and training prevalence</caption><thead><tr><th>Method</th><th>ROC-AUC</th><th>Precision</th><th>Recall</th><th>F1</th><th>Brier ↓</th><th>Threshold</th></tr></thead><tbody>{([['Logistic regression',test.model],['Deterministic baseline',test.deterministic_baseline],['Training prevalence',test.prevalence_baseline]] as const).map(([name,m])=><tr key={name}><th scope="row">{name}</th>{[m.roc_auc,m.precision,m.recall,m.f1,m.brier,m.threshold].map((value,index)=><td key={index}>{formatted(value)}</td>)}</tr>)}</tbody></table></div><p>{report.baseline_note}</p></section>
    <section className="panel support-card"><h2>Calibration check</h2><p>Compare mean predicted probability with the observed positive fraction in each test bin. Sparse bins are uncertain; this is a check, not a guarantee of calibration.</p><div className="support-table-wrap"><table className="support-table"><thead><tr><th>Probability bin</th><th>Students</th><th>Mean prediction</th><th>Observed fraction</th></tr></thead><tbody>{test.model.calibration_bins.map(bin=><tr key={bin.lower}><td>{bin.lower.toFixed(1)}–{bin.upper.toFixed(1)}</td><td>{bin.count}</td><td>{formatted(bin.mean_score)}</td><td>{formatted(bin.observed_positive_fraction)}</td></tr>)}</tbody></table></div></section>
    <section className="panel support-card"><h2>Limitations and reproducibility</h2><ul>{report.limitations.map(note=><li key={note}>{note}</li>)}</ul><p>Run <code>python scripts/train_model.py</code> from the repository root. The report records dependency versions, split membership, data and artifact hashes.</p><p>Data SHA-256: <code>{report.data_sha256}</code></p></section>
  </>;
}
