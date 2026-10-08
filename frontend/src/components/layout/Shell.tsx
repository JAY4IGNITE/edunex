import { Suspense, useEffect } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Layers3,
  Lightbulb,
  Database,
  ArrowUpRight,
  Menu,
} from "lucide-react";
import { useFilters } from "@/hooks/useFilters";
import { FilterBar } from "@/components/filters/FilterBar";
import { api } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { readableSourceText } from "@/utils/text";
const destinations = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/risks", label: "Risks", icon: ShieldCheck },
  { to: "/segments", label: "Segments", icon: Layers3 },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/data", label: "Data Integration", icon: Database },
];
export default function Shell() {
  const location = useLocation();
  const { cohortSearch } = useFilters();
  const provenance = useQuery({
    queryKey: ["provenance"],
    queryFn: ({ signal }) => api.provenance(signal),
    staleTime: 30 * 60 * 1000,
  });
  useEffect(() => {
    const path = location.pathname === "/dashboard" ? "/" : location.pathname;
    document.title = `${destinations.find((d) => d.to === path)?.label ?? (path.startsWith("/students/") ? "Student 360" : "Page not found")} · CampusPulse AI`;
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const nav = (mobile = false) =>
    destinations.map(({ to, label, icon: Icon }) => {
      const link = (
        <NavLink
          key={to}
          to={`${to}${cohortSearch}`}
          end={to === "/"}
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      );
      return mobile ? (
        <DialogClose asChild key={to}>
          {link}
        </DialogClose>
      ) : (
        link
      );
    });
  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="topbar">
        <NavLink
          to={`/${cohortSearch}`}
          className="brand"
          aria-label="CampusPulse AI overview"
        >
          <span className="brand-mark">
            <Activity size={25} />
          </span>
          <span>
            CampusPulse <b>AI</b>
            <small>STUDENT SUCCESS INTELLIGENCE</small>
          </span>
        </NavLink>
        <div className="topbar-right">
          <span className="workspace-label">Institutional workspace</span>
          <span className="evaluator-avatar" aria-label="Evaluator view">
            E
          </span>
          <span className="evaluator-label">Evaluator view</span>
        </div>
      </header>
      <aside className="sidebar">
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Main navigation">{nav()}</nav>
        <div className="sidebar-note">
          <span className="sidebar-note-icon">
            <Layers3 size={20} />
          </span>
          <p>
            One campus.
            <br />
            <strong>A connected perspective.</strong>
          </p>
          <span>
            Smart Campus Analytics: Predict, Understand &amp; Improve Student
            Success
          </span>
          <NavLink className="sidebar-data-link" to={`/data${cohortSearch}`}>
            Data &amp; provenance <ArrowUpRight size={15} />
          </NavLink>
        </div>
        <div className="sidebar-footer">
          <span className="small-mark">
            <Activity size={13} />
          </span>
          CampusPulse AI <span>Phase 13</span>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1}>
        <div className="content-wrap">
          <FilterBar
            key={cohortSearch}
            scope={
              location.pathname === "/data"
                ? "institution"
                : /^\/students\/.+/.test(location.pathname)
                  ? "student"
                  : "cohort"
            }
          />
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
          <footer className="page-footer">
            <span>
              {readableSourceText(
                provenance.data?.authenticity ?? "Data provenance unavailable",
              )}
            </span>
            <NavLink to={`/data${cohortSearch}`}>
              View data provenance <ArrowUpRight size={13} />
            </NavLink>
          </footer>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {destinations
          .filter((d) =>
            ["/", "/students", "/risks", "/insights"].includes(d.to),
          )
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={`${to}${cohortSearch}`}
              end={to === "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="mobile-menu-button">
              <Menu size={20} />
              <span>More</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="navigation-dialog">
            <DialogTitle>Explore CampusPulse</DialogTitle>
            <DialogDescription>
              Student success intelligence, in one place.
            </DialogDescription>
            <nav aria-label="All destinations">{nav(true)}</nav>
          </DialogContent>
        </Dialog>
      </nav>
    </div>
  );
}
