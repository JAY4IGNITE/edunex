import { ArrowDown, ArrowUpRight, Check, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { ProductPreview } from "./ProductPreview";
import ColorBends from "../../../components/ui/ColorBends";

export function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.4, pointerEvents: 'none' }}>
        <ColorBends
          colors={["#00e5ff", "#a5a8ff", "#0070f3"]}
          rotation={90}
          speed={0.2}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={0.5}
          noise={0.15}
          parallax={0.5}
          iterations={1}
          intensity={1.5}
          bandWidth={6}
          transparent
          autoRotate={0.05}
        />
      </div>
      <div className="landing-container hero-layout" style={{ position: 'relative', zIndex: 1 }}>
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
      <div className="landing-container hero-bottom" style={{ position: 'relative', zIndex: 1 }}><span>BUILT AROUND STUDENT SUCCESS</span><a href="#intelligence">Discover the platform <ArrowDown size={15} aria-hidden="true" /></a></div>
    </section>
  );
}
