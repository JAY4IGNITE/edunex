import { useQuery } from "@tanstack/react-query";
import { ChartNoAxesCombined } from "lucide-react";
import { api } from "@/services/api";
import { SectionHeading } from "@/components/cards/Shared";
import { QueryState } from "@/components/states/States";
import { ChartSkeleton } from "@/components/skeletons";
import { Link } from "react-router-dom";

export function AIPredictionPanel({ studentId }: { studentId: string }) {
  const prediction = useQuery({
    queryKey: ["ai-prediction", studentId],
    queryFn: ({ signal }) => api.aiPrediction(studentId, signal),
  });

  return (
    <QueryState
      query={prediction}
      skeleton={<ChartSkeleton />}
      message="AI prediction temporarily unavailable."
    >
      {(data) => {
        if (data.status === "fallback") return <section className="panel"><SectionHeading title="Transparent baseline fallback" /><p>{data.reason}</p><p><strong>{data.risk_score?.toFixed(2)}/100 · {data.risk_level}</strong></p><p className="paragraph-small muted">Current academic risk score, not a future probability. Review the baseline drivers and missing-data notes above.</p><Link className="text-link" to="/model">Model methodology and limitations</Link></section>;
        if (data.status !== "success" || data.risk_probability == null) {
          return (
            <section className="panel" data-reveal>
              <SectionHeading
                title="Synthetic prediction model"
                action={<ChartNoAxesCombined size={19} className="muted" />}
              />
              <div className="empty-state" style={{ padding: "2rem 0", textAlign: "center" }}>
                <p className="muted">AI early-warning prediction unavailable</p>
                <p className="paragraph-small muted">
                  {data.reason || "Additional semester history is required for this model."}
                </p>
              </div>
            </section>
          );
        }

        const riskProb = (data.risk_probability * 100).toFixed(2);
        
        return (
          <section className="panel" data-reveal>
            <SectionHeading
              title="Synthetic prediction model"
              action={<ChartNoAxesCombined size={19} className="muted" />}
            />
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
              <div style={{ flex: "1 1 200px" }}>
                <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>Model Prediction</p>
                <div style={{ fontSize: "2.5rem", fontWeight: "bold", lineHeight: 1 }}>
                  {riskProb}%
                </div>
                <div style={{ fontWeight: 500, marginTop: "0.25rem", color: data.prediction === "Elevated Risk" ? "var(--accent-red)" : "var(--accent-green)" }}>
                  {data.prediction}
                </div>
                <p className="paragraph-small muted" style={{ marginTop: "0.25rem" }}>
                  Estimated next-semester backlog probability · synthetic model
                </p>
              </div>
              <div style={{ flex: "2 1 300px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="paragraph-small muted">Model Version</span>
                    <span className="paragraph-small font-mono">{data.model_version}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="paragraph-small muted">Prediction Horizon</span>
                    <span className="paragraph-small">Next Semester</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="paragraph-small muted">Target</span>
                    <span className="paragraph-small">Backlog occurrence</span>
                  </div>
                </div>
              </div>
            </div>

            {data.top_factors && (
              <div style={{ marginTop: "2rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
                <p className="eyebrow" style={{ marginBottom: "1rem" }}>MODEL CONTRIBUTIONS · LOG-ODDS</p>
                
                <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
                  <div>
                    <h4 style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--accent-red)" }}>Higher predicted risk contributors</h4>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {data.top_factors.top_higher_risk.map(factor => (
                        <li key={factor.feature} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-sunken)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{factor.feature}</span>
                            <span className="paragraph-small muted">Value: {factor.value}</span>
                          </div>
                          <span style={{ fontWeight: 600, color: "var(--accent-red)", fontFamily: "monospace" }}>
                            +{factor.contribution.toFixed(4)}
                          </span>
                        </li>
                      ))}
                      {data.top_factors.top_higher_risk.length === 0 && (
                        <li className="paragraph-small muted">No significant higher-risk contributors</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 style={{ fontSize: "0.875rem", marginBottom: "0.75rem", color: "var(--accent-green)" }}>Lower predicted risk contributors</h4>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {data.top_factors.top_lower_risk.map(factor => (
                        <li key={factor.feature} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-sunken)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{factor.feature}</span>
                            <span className="paragraph-small muted">Value: {factor.value}</span>
                          </div>
                          <span style={{ fontWeight: 600, color: "var(--accent-green)", fontFamily: "monospace" }}>
                            {factor.contribution.toFixed(4)}
                          </span>
                        </li>
                      ))}
                      {data.top_factors.top_lower_risk.length === 0 && (
                        <li className="paragraph-small muted">No significant lower-risk contributors</li>
                      )}
                    </ul>
                  </div>
                </div>
                
                <p className="paragraph-small muted" style={{ marginTop: "1.5rem", fontStyle: "italic" }}>
                  {data.limitation} Contributions describe associations relative to the training mean, not causal effects.
                </p>
                <Link className="text-link" to="/model">View measured performance and calibration</Link>
              </div>
            )}
          </section>
        );
      }}
    </QueryState>
  );
}
