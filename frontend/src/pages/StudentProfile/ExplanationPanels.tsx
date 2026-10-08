import type { Explanation, RiskExplanation } from "@/types/api";
import { humanize, number } from "@/utils/data";
import { SectionHeading, RiskBadge } from "@/components/cards/Shared";
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
          description="Domain values, effective weights, and contributions returned by the backend."
        />
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Score contributors"
        >
          <table>
            <caption className="sr-only">
              Success score contributing domains
            </caption>
            <thead>
              <tr>
                <th>Contributing domain</th>
                <th>Value</th>
                <th>Configured weight</th>
                <th>Effective weight</th>
                <th>Contribution</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {explanation.success_score.contributors.map((c) => (
                <tr key={c.name}>
                  <td>
                    <strong className="domain-name">{humanize(c.name)}</strong>
                    <div className="domain-bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${Math.min(100, Math.max(0, c.normalized_value ?? 0))}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td>{number(c.normalized_value)}</td>
                  <td>{number(c.configured_weight * 100)}%</td>
                  <td>{number(c.effective_weight * 100)}%</td>
                  <td>
                    {number(c.contribution)}
                    <small className="table-score-band">{c.direction}</small>
                  </td>
                  <td>
                    {c.excluded_from_calculation
                      ? "Excluded"
                      : humanize(c.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      <h3 className="subheading">Risk drivers</h3>
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
      <h3 className="subheading protective-heading">Protective indicators</h3>
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
          <p>Missing signals are excluded by the backend calculation.</p>
        </>
      ) : (
        <p>None reported.</p>
      )}
    </div>
  );
}
