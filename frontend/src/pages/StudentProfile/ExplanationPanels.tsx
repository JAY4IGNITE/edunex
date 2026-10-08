import type { Explanation, RiskExplanation } from "@/types/api";
import { humanize, number } from "@/utils/data";
import { SectionHeading, RiskBadge } from "@/components/cards/Shared";
import { DomainIcon } from "@/components/analytics/DomainIcon";
import { ChartNoAxesCombined, ShieldCheck, ShieldAlert } from "lucide-react";
export function ExplanationPanels({
  explanation,
}: {
  explanation: Explanation;
}) {
  return (
    <>
      <section className="panel explanation-panel">
        <SectionHeading
          title="Explainable Score"
          description="Understand the signals behind this score, including each domain's weight and contribution."
          action={
            <ChartNoAxesCombined
              size={20}
              aria-hidden="true"
              className="muted"
            />
          }
        />
        <div
          className="contribution-grid"
          role="region"
          aria-label="Score contributors"
        >
          {explanation.success_score.contributors.map((c) => (
            <article
              className={`contribution-card ${c.excluded_from_calculation ? "contribution-excluded" : ""}`}
              key={c.name}
            >
              <div className="contribution-heading">
                <span className="contribution-domain-icon">
                  <DomainIcon domain={c.name} />
                </span>
                <h3>{humanize(c.name)}</h3>
                <span className="contribution-status">
                  {c.excluded_from_calculation
                    ? "Excluded"
                    : humanize(c.status)}
                </span>
              </div>
              <div className="contribution-value">
                <strong>{number(c.normalized_value)}</strong>
                <span>domain score</span>
              </div>
              <div className="contribution-track" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.min(100, Math.max(0, c.normalized_value ?? 0))}%`,
                  }}
                />
              </div>
              <dl className="contribution-metrics">
                <div>
                  <dt>Configured weight</dt>
                  <dd>{number(c.configured_weight * 100)}%</dd>
                </div>
                <div>
                  <dt>Effective weight</dt>
                  <dd>{number(c.effective_weight * 100)}%</dd>
                </div>
                <div>
                  <dt>Contribution</dt>
                  <dd>
                    {number(c.contribution)}
                    <small>{c.direction}</small>
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <MissingSignals
          signals={explanation.success_score.missing_domains}
          label="Unavailable domains"
        />
      </section>
      <div className="grid-two">
        <RiskExplanationPanel
          title="Academic risk explanation"
          data={explanation.academic_risk}
        />
        <RiskExplanationPanel
          title="Placement risk explanation"
          data={explanation.placement_risk}
        />
      </div>
    </>
  );
}
function RiskExplanationPanel({
  title,
  data,
}: {
  title: string;
  data: RiskExplanation;
}) {
  return (
    <section className="panel">
      <SectionHeading
        title={title}
        action={<RiskBadge level={data.risk_level} />}
      />
      <h3 className="subheading driver-heading">
        <ShieldAlert size={15} aria-hidden="true" />
        Risk drivers
      </h3>
      {data.drivers.length ? (
        <ul className="driver-list">
          {data.drivers.map((driver) => (
            <li key={driver.name}>
              <div>
                <span>{humanize(driver.name)}</span>
                <small>
                  Effective weight {number(driver.effective_weight * 100)}% ·
                  value {number(driver.normalized_value)}
                </small>
                <div className="risk-driver-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.min(100, Math.max(0, driver.risk_contribution ?? 0))}%`,
                    }}
                  />
                </div>
              </div>
              <strong>
                {number(driver.risk_contribution)}
                <small>contribution</small>
              </strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted paragraph-small">No risk drivers reported.</p>
      )}
      <h3 className="subheading protective-heading driver-heading">
        <ShieldCheck size={15} aria-hidden="true" />
        Protective indicators
      </h3>
      {data.protective_indicators.length ? (
        <ul className="driver-list protective-list">
          {data.protective_indicators.map((driver) => (
            <li key={driver.name}>
              <div>
                <span>{humanize(driver.name)}</span>
                <small>
                  Effective weight {number(driver.effective_weight * 100)}% ·
                  value {number(driver.normalized_value)}
                </small>
                <div className="risk-driver-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.min(100, Math.max(0, driver.risk_contribution ?? 0))}%`,
                    }}
                  />
                </div>
              </div>
              <strong>
                {number(driver.risk_contribution)}
                <small>contribution</small>
              </strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted paragraph-small">
          No protective indicators reported.
        </p>
      )}
      <MissingSignals
        signals={data.missing_signals}
        label="Unavailable signals"
      />
    </section>
  );
}
export function MissingSignals({
  signals,
  label,
}: {
  signals: string[];
  label: string;
}) {
  return (
    <div className="missing-signals">
      <h3>{label}</h3>
      {signals.length ? (
        <>
          <div>
            {signals.map((signal) => (
              <span key={signal}>{humanize(signal)}</span>
            ))}
          </div>
          <p>Missing signals are excluded from the score calculation.</p>
        </>
      ) : (
        <p>None reported.</p>
      )}
    </div>
  );
}
