import { ArrowUpRight, ChartNoAxesCombined, CircleAlert, GraduationCap, LayoutDashboard, Users } from "lucide-react";

export function ProductPreview() {
  return (
    <figure className="product-preview" aria-label="Illustrative EduNex student success dashboard">
      <div className="preview-toolbar"><span><LayoutDashboard size={16} aria-hidden="true" /> Campus overview</span><span className="preview-demo">Illustrative data</span></div>
      <div className="preview-body">
        <div className="preview-heading"><div><span className="preview-kicker">THE BIG PICTURE</span><h2>Student success, in focus.</h2></div><span className="preview-avatar">EN</span></div>
        <div className="preview-metrics">
          <div><Users size={17} aria-hidden="true" /><span>Total students</span><strong>2,450</strong><small>Across your campus</small></div>
          <div><GraduationCap size={17} aria-hidden="true" /><span>Success score</span><strong>76.8<em>/100</em></strong><small className="preview-positive">↗ 4.2 pts this semester</small></div>
          <div><CircleAlert size={17} aria-hidden="true" /><span>Need attention</span><strong>124</strong><small>Early support matters</small></div>
        </div>
        <div className="preview-chart">
          <div className="preview-chart-title"><strong>Success over time</strong><span><i /> Success score</span></div>
          <div className="preview-plot">
            <div className="preview-axis"><span>100</span><span>75</span><span>50</span></div>
            <svg viewBox="0 0 440 120" role="img" aria-label="Illustrative success score trend rising from 58 to 77 between January and June" preserveAspectRatio="none">
              <defs><linearGradient id="success-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--landing-accent)" stopOpacity=".2" /><stop offset="100%" stopColor="var(--landing-accent)" stopOpacity="0" /></linearGradient></defs>
              <path className="preview-gridline" d="M0 10H440 M0 58H440 M0 106H440" />
              <path d="M0 91 C35 91 45 79 83 81 S130 91 165 76 S218 83 250 68 S296 73 334 60 S399 66 440 54 V120 H0Z" fill="url(#success-fill)" />
              <path d="M0 91 C35 91 45 79 83 81 S130 91 165 76 S218 83 250 68 S296 73 334 60 S399 66 440 54" fill="none" stroke="var(--landing-accent)" strokeWidth="3" />
              <circle cx="436" cy="55" r="4" fill="var(--landing-accent)" stroke="var(--landing-surface)" strokeWidth="2" />
            </svg>
          </div>
          <div className="preview-months">{["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map(month => <span key={month}>{month}</span>)}</div>
        </div>
        <div className="preview-insight"><span className="preview-insight-icon"><ChartNoAxesCombined size={19} aria-hidden="true" /></span><div><strong>Turn a signal into support.</strong><p>Identify students who may benefit from an early check-in.</p></div><ArrowUpRight size={18} aria-hidden="true" /></div>
      </div>
      <figcaption>PRODUCT PREVIEW <span>Student 360 · Risk intelligence · Actionable insights</span></figcaption>
    </figure>
  );
}

