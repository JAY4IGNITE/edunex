import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function LandingNavbar() {
  return (
    <header className="landing-nav">
      <a className="landing-skip" href="#landing-main">Skip to content</a>
      <nav className="landing-container landing-nav-inner" aria-label="Main navigation">
        <Link to="/" className="landing-logo" aria-label="EduNex home">
          <BrandMark /><span>EduNex</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#intelligence">Platform</a>
          <a href="#how-it-works">How it works</a>
          <a href="#early-warning">Why EduNex</a>
        </div>
        <div className="landing-nav-actions">
          <ThemeToggle />
          <Link to="/login" className="landing-nav-cta">Staff access <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </nav>
    </header>
  );
}
