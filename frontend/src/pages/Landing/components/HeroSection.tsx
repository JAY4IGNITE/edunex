import { ArrowDown, ArrowUpRight, Check, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductPreview } from "./ProductPreview";

export function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="landing-container hero-layout">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span /> A clearer picture. A stronger campus.</div>
          <h1 id="hero-title">See the potential.<br />Spot the risk.<br /><span>Shape the future.</span></h1>
          <p className="hero-description">Every student has a story. Connect the data behind it to understand progress, recognize risk, and make the next right move.</p>
          <div className="hero-actions">
            <Link to="/dashboard" className="landing-btn-primary">Explore the dashboard <ArrowUpRight size={18} aria-hidden="true" /></Link>
            <a href="#how-it-works" className="landing-btn-secondary">How it works <ArrowDown size={16} aria-hidden="true" /></a>
          </div>
          <div className="hero-reassurance"><Check size={15} aria-hidden="true" /> Connected data <span /> Explainable insights <span /> Earlier action</div>
        </div>
        <div className="hero-product">
          <div className="product-overline"><Layers size={14} aria-hidden="true" /> YOUR CAMPUS, CONNECTED <span>STUDENT INTELLIGENCE</span></div>
          <ProductPreview />
          <div className="product-caption"><span className="status-dot" /> One connected view. More informed decisions.</div>
        </div>
      </div>
      <div className="landing-container hero-bottom"><span>BUILT AROUND STUDENT SUCCESS</span><a href="#intelligence">Discover the platform <ArrowDown size={15} aria-hidden="true" /></a></div>
    </section>
  );
}
