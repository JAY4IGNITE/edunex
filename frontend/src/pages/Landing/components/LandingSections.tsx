import { ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, BriefcaseBusiness, Check, Database, GraduationCap, Layers, MessageSquare, Network, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/layout/BrandMark";

const domains = [
  { name: "Academics", icon: GraduationCap }, { name: "Attendance", icon: Users },
  { name: "LMS", icon: BookOpen }, { name: "Engagement", icon: Network },
  { name: "Placement", icon: BriefcaseBusiness }, { name: "Skills", icon: Sparkles },
  { name: "Feedback", icon: MessageSquare },
];

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Connected data domains">
      <div className="landing-container">
        <p>SEVEN DATA DOMAINS. <strong>ONE COMPLETE PICTURE.</strong></p>
        <div className="trust-domains">{domains.map(({ name, icon: Icon }) => <span key={name}><Icon size={20} aria-hidden="true" />{name}</span>)}</div>
      </div>
    </section>
  );
}

export function ProblemSection() {
  return (
    <section id="intelligence" className="landing-section platform-section">
      <div className="landing-container">
        <div className="section-heading-row">
          <div><span className="landing-eyebrow">THE CONNECTED CAMPUS</span><h2>Less scattered data.<br />More meaningful decisions.</h2></div>
          <p>Bring every part of the student journey into focus. Give your teams the context to see what matters and where to help.</p>
        </div>
        <div className="capability-grid">
          {[
            { num: "01", icon: Layers, title: "See the whole student", text: "Connect academic performance, engagement, and career readiness in one Student 360 profile.", link: "/students", label: "Explore student profiles", tag: "STUDENT 360", className: "capability-profile" },
            { num: "02", icon: BrainCircuit, title: "Understand the signals", text: "Surface academic and placement risks, with clear explanations of the factors behind each insight.", link: "/risks", label: "Explore risk intelligence", tag: "EXPLAINABLE INTELLIGENCE", className: "capability-risk" },
            { num: "03", icon: Users, title: "Focus your support", text: "Group students by shared needs so your teams can plan more relevant, targeted interventions.", link: "/segments", label: "Explore student segments", tag: "TARGETED SUPPORT", className: "capability-support" },
          ].map(({ num, icon: Icon, title, text, link, label, tag, className }) => (
            <article className={"capability-card " + className} key={num}>
              <div className="capability-top"><span className="capability-icon"><Icon size={24} aria-hidden="true" /></span><span>{num}</span></div>
              <span className="capability-tag">{tag}</span><h3>{title}</h3><p>{text}</p>
              <Link to={link}>{label}<ArrowUpRight size={17} aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AIEarlyWarningSection() {
  return (
    <section id="early-warning" className="landing-section warning-section">
      <div className="landing-container warning-layout">
        <div className="warning-copy">
          <span className="landing-eyebrow">EARLIER INSIGHT. BETTER SUPPORT.</span>
          <h2>Behind every risk signal,<br />a reason to reach out.</h2>
          <p>Spot patterns that deserve attention before they become bigger challenges. EduNex pairs predictive insights with clear explanations, so your team can act with context.</p>
          <ul className="warning-benefits">
            <li><Check size={17} aria-hidden="true" /> Understand which factors contribute to risk</li>
            <li><Check size={17} aria-hidden="true" /> See academic and engagement patterns together</li>
            <li><Check size={17} aria-hidden="true" /> Keep people at the heart of every decision</li>
          </ul>
          <Link to="/insights" className="landing-text-link">Discover the intelligence <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="signal-card">
          <div className="signal-header"><span><BrainCircuit size={18} aria-hidden="true" /> Early warning intelligence</span><span className="signal-example">EXAMPLE</span></div>
          <div className="signal-summary"><span className="signal-avatar">ST</span><div><strong>A clearer view of student risk</strong><span>Academic outlook · Next semester</span></div></div>
          <div className="signal-score"><div><span>Predicted risk probability</span><strong>78.5<small>%</small></strong></div><span className="signal-status">Elevated risk</span></div>
          <div className="signal-factors">
            <div><span>Contributing factors</span><span>Impact on prediction</span></div>
            <div><span>Historical backlogs</span><b className="factor-risk">Increases risk <ArrowUpRight size={14} aria-hidden="true" /></b></div>
            <div><span>Declining academic trend</span><b className="factor-risk">Increases risk <ArrowUpRight size={14} aria-hidden="true" /></b></div>
            <div><span>Consistent LMS activity</span><b className="factor-positive">Reduces risk <Check size={14} aria-hidden="true" /></b></div>
          </div>
          <div className="signal-note"><ShieldCheck size={18} aria-hidden="true" /><p>Explainable predictions to support professional judgment.</p></div>
          <p className="signal-caption">Illustrative prediction and contributing factors.</p>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-section workflow-section">
      <div className="landing-container">
        <div className="section-heading-center"><span className="landing-eyebrow">FROM INFORMATION TO ACTION</span><h2>A clearer path to student success.</h2><p>Four connected steps. One shared understanding.</p></div>
        <div className="workflow-grid">
          {[
            { icon: Database, title: "Connect", desc: "Bring your seven institutional data domains together." },
            { icon: Layers, title: "Understand", desc: "Build a complete student picture with unified success scores." },
            { icon: BrainCircuit, title: "Anticipate", desc: "Recognize emerging risks and understand what drives them." },
            { icon: Users, title: "Support", desc: "Use shared insights to guide focused, timely interventions." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <article className="workflow-step" key={title}><div className="workflow-step-top"><span><Icon size={23} aria-hidden="true" /></span><span>0{i + 1}</span></div><h3>{title}</h3><p>{desc}</p></article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardPreview() {
  return (
    <section className="landing-cta-section">
      <div className="landing-container"><div className="landing-cta">
        <div><span className="landing-eyebrow">EVERY STUDENT. EVERY POSSIBILITY.</span><h2>See your campus differently.</h2><p>Better context for your teams. Better support for your students.</p></div>
        <div className="landing-cta-actions"><Link to="/dashboard" className="landing-btn-primary">Explore the dashboard <ArrowUpRight size={18} aria-hidden="true" /></Link><span>For campus administrators & counseling teams</span></div>
      </div></div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="footer-inner"><div><Link to="/" className="landing-logo" aria-label="EduNex home"><BrandMark /><span>EduNex</span></Link><p>Connected insights. Student-centered decisions.</p></div>
          <nav className="footer-links" aria-label="Footer navigation"><Link to="/dashboard">Dashboard</Link><Link to="/students">Students</Link><Link to="/insights">Insights</Link><Link to="/data">Data integration</Link></nav>
        </div>
        <div className="footer-bottom"><span>EduNex · Smart Campus Intelligence</span><p>Prototype for the KPMG Ideation Challenge. Use synthetic data; real student data requires institutional consent.</p></div>
      </div>
    </footer>
  );
}
