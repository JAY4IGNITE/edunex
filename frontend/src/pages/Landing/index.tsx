import "./landing.css";
import { LandingNavbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { DemoRolePicker } from "@/components/auth/DemoAuth";
import { TrustStrip, ProblemSection, AIEarlyWarningSection, HowItWorks, DashboardPreview, LandingFooter } from "./components/LandingSections";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <LandingNavbar />
      <main id="landing-main" tabIndex={-1}>
        <HeroSection />
        <TrustStrip />
        <ProblemSection />
        <AIEarlyWarningSection />
        <HowItWorks />
        <DashboardPreview />
        <div className="landing-container"><DemoRolePicker /></div>
      </main>
      <LandingFooter />
    </div>
  );
}
