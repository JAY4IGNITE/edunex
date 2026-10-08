import { readableSourceText } from "@/utils/text";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  FileCheck2,
  ArrowRight,
  Workflow,
  CircleCheck,
  CircleAlert,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/services/api";
import {
  PageHeading,
  SectionHeading,
  MetricList,
} from "@/components/cards/Shared";
import { QueryState, EmptyState } from "@/components/states/States";
import {
  ChartSkeleton,
  InsightSkeleton,
  TableSkeleton,
} from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { humanize, number } from "@/utils/data";
import { DomainIcon } from "@/components/analytics/DomainIcon";
const domainKeys: Record<string, string> = {
  Academic: "academic_records",
  Attendance: "attendance_records",
  LMS: "lms_records",
  Engagement: "engagement_records",
  Placement: "placement_records",
  Skills: "skill_records",
  Feedback: "feedback_records",
};
export default function DataIntegration() {
  const sources = useQuery({
    queryKey: ["sources"],
    queryFn: ({ signal }) => api.sources(signal),
    staleTime: 30 * 60 * 1000,
  });
  const registry = useQuery({
    queryKey: ["registry"],
    queryFn: ({ signal }) => api.registry(signal),
    staleTime: 30 * 60 * 1000,
  });
  const quality = useQuery({
    queryKey: ["quality"],
    queryFn: ({ signal }) => api.quality(signal),
    staleTime: 30 * 60 * 1000,
  });
  const provenance = useQuery({
    queryKey: ["provenance"],
    queryFn: ({ signal }) => api.provenance(signal),
    staleTime: 30 * 60 * 1000,
  });
  return (
    <>
      <PageHeading
        eyebrow="Data integration"
        title="Data integration"
        description="Understand the sources, coverage, and quality behind the student success picture."
      />
      <QueryState
        query={provenance}
        skeleton={<ChartSkeleton />}
        message="Unable to load data provenance."
      >
        {(data) => (
          <section className="panel provenance-hero data-pipeline-hero">
            <span className="data-hero-icon">
              <Database size={25} />
            </span>
            <div>
              <p className="eyebrow">Integrated dataset</p>
              <h2>{data.source_name}</h2>
              <p>{readableSourceText(data.authenticity)}</p>
              <div className="domain-flow">
                {data.domains.map((domain) => (
                  <span key={domain}>
                    <DomainIcon domain={domain} size={14} />
                    {humanize(domain)}
                  </span>
                ))}
                <ArrowRight size={15} />
                <strong>
                  <Workflow size={15} aria-hidden="true" />
                  Student 360
                </strong>
              </div>
              <div className="provenance-status">
                <ShieldCheck size={14} aria-hidden="true" />
                <span>{data.verification_status}</span>
                <span>Dataset: {data.dataset_id}</span>
              </div>
            </div>
          </section>
        )}
      </QueryState>
      <section className="data-section">
        <SectionHeading
          title="Data Coverage"
          description="Accepted source records by domain from the ingestion report. Records are not unique students."
        />
        <QueryState
          query={quality}
          message="Unable to load data coverage."
          skeleton={
            <div className="grid-three">
              {[1, 2, 3].map((n) => (
                <InsightSkeleton key={n} />
              ))}
            </div>
          }
        >
          {(data) => (
            <div className="coverage-grid">
              {Object.entries(domainKeys).map(([label, key]) => {
                const stats = data.domains[key];
                return (
                  <article
                    className="panel coverage-card domain-coverage-card"
                    key={key}
                  >
                    <span className="coverage-domain-icon">
                      <DomainIcon domain={label} />
                    </span>
                    <h3>{label}</h3>
                    <strong>{number(stats?.records_accepted, 0)}</strong>
                    <p>accepted records</p>
                    {stats && (
                      <>
                        <small>
                          {number(stats.records_processed, 0)} processed
                        </small>
                        <div
                          className="coverage-record-track"
                          aria-hidden="true"
                        >
                          <span
                            style={{
                              width: `${stats.records_processed ? Math.min(100, Math.max(0, (stats.records_accepted / stats.records_processed) * 100)) : 0}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`coverage-quality-status ${stats.records_rejected ? "has-rejections" : ""}`}
                        >
                          {stats.records_rejected ? (
                            <CircleAlert size={13} aria-hidden="true" />
                          ) : (
                            <CircleCheck size={13} aria-hidden="true" />
                          )}
                          {number(stats.records_rejected, 0)} rejected
                        </span>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </QueryState>
      </section>
      <section className="data-section">
        <SectionHeading
          title="Data Sources"
          description="Registry metadata, including candidate and planned sources, exactly as recorded."
        />
        <QueryState
          query={registry}
          message="Unable to load the dataset registry."
          skeleton={
            <div className="grid-three">
              {[1, 2, 3].map((n) => (
                <InsightSkeleton key={n} />
              ))}
            </div>
          }
        >
          {(data) =>
            Object.keys(data.datasets).length ? (
              <div className="grid-three source-grid">
                {Object.values(data.datasets).map((dataset) => (
                  <article
                    className="panel source-card"
                    key={dataset.dataset_id}
                  >
                    <div className="source-card-top">
                      <FileCheck2 size={19} />
                      <Badge variant="outline">{dataset.status}</Badge>
                    </div>
                    <h3>{dataset.name}</h3>
                    <p>{dataset.description}</p>
                    <div className="domain-chips">
                      {dataset.domains_covered.map((domain) => (
                        <span key={domain}>{domain}</span>
                      ))}
                    </div>
                    <MetricList
                      entries={[
                        {
                          label: "Source type",
                          value: humanize(dataset.source_type),
                        },
                        {
                          label: "Authenticity",
                          value: readableSourceText(dataset.authenticity),
                        },
                        {
                          label: "Verification",
                          value: dataset.verification_status,
                        },
                        { label: "Acquired", value: dataset.acquisition_date },
                        { label: "License", value: dataset.license },
                      ]}
                    />
                    <details className="source-notes">
                      <summary>Reference &amp; notes</summary>
                      <p>{dataset.reference}</p>
                      <ul>
                        {dataset.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </details>
                  </article>
                ))}
              </div>
            ) : (
              <div className="panel">
                <EmptyState title="No data sources available." />
              </div>
            )
          }
        </QueryState>
      </section>
      <section className="data-section">
        <SectionHeading
          title="Data Quality"
          description="Reported validation outcomes from the latest available ingestion artifact."
        />
        <QueryState
          query={quality}
          message="Unable to load data quality."
          skeleton={<TableSkeleton />}
        >
          {(data) => (
            <div className="panel quality-panel">
              <p className="quality-time">
                <Database size={15} aria-hidden="true" />
                Dataset: {data.dataset_id} · Ingestion run: {data.run_time}
              </p>
              {!Object.keys(data.domains).length ? (
                <EmptyState
                  title="No quality report available."
                  description="No domain validation records were returned for this dataset."
                />
              ) : (
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Data quality report"
                >
                  <table>
                    <caption className="sr-only">
                      Ingestion data quality by domain
                    </caption>
                    <thead>
                      <tr>
                        <th>Domain</th>
                        <th>Processed</th>
                        <th>Accepted</th>
                        <th>Rejected</th>
                        <th>Missing values</th>
                        <th>Duplicates</th>
                        <th>Schema errors</th>
                        <th>Invalid ranges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.domains).map(([domain, stats]) => (
                        <tr key={domain}>
                          <td>{humanize(domain)}</td>
                          {(
                            [
                              "records_processed",
                              "records_accepted",
                              "records_rejected",
                              "missing_values",
                              "duplicate_records",
                              "schema_errors",
                              "invalid_ranges",
                            ] as const
                          ).map((key) => (
                            <td key={key}>{number(stats[key], 0)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </QueryState>
      </section>
      <div className="grid-two">
        <section className="panel">
          <SectionHeading
            title="Data Provenance"
            description="Origin and authenticity of the integrated dataset."
          />
          <QueryState
            query={provenance}
            message="Unable to load provenance."
            skeleton={<InsightSkeleton />}
          >
            {(data) => (
              <MetricList
                entries={[
                  { label: "Dataset", value: data.dataset_id },
                  { label: "Source", value: data.source_name },
                  { label: "Reference", value: data.reference },
                  {
                    label: "Authenticity",
                    value: readableSourceText(data.authenticity),
                  },
                  { label: "License", value: data.license },
                  { label: "Acquisition date", value: data.acquisition_date },
                  { label: "Verification", value: data.verification_status },
                ]}
              />
            )}
          </QueryState>
        </section>
        <section className="panel">
          <SectionHeading
            title="Verified Source Mappings"
            description="Only mappings present in the backend registry are shown."
          />
          <QueryState
            query={sources}
            message="Unable to load source mappings."
            skeleton={<InsightSkeleton />}
          >
            {(data) => (
              <>
                {!Object.keys(data.mappings).length && (
                  <EmptyState
                    title="No verified mappings available."
                    description="Source mappings will appear when they are present in the registry."
                  />
                )}
                {Object.entries(data.mappings).map(([dataset, fields]) => (
                  <div key={dataset}>
                    <h3 className="subheading">{dataset}</h3>
                    {Object.entries(fields).map(([field, mapping]) => (
                      <div className="mapping-row" key={field}>
                        <div>
                          <strong>{field}</strong>
                          <ArrowRight size={12} />
                          <strong>{mapping.canonical_field}</strong>
                        </div>
                        <p>
                          Transformation: {mapping.transformation} · Validation:{" "}
                          {mapping.validation}
                        </p>
                        <small>{mapping.verification_status}</small>
                      </div>
                    ))}
                  </div>
                ))}
                <details className="source-notes">
                  <summary>Source handling rules</summary>
                  <ul>
                    {data.rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </QueryState>
        </section>
      </div>
    </>
  );
}
