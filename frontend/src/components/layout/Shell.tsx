import { Suspense, useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import {
  Building2,
  ChevronRight,
  Command,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { PageSkeleton } from "@/components/skeletons";
import { useFilters } from "@/hooks/useFilters";
import { FilterBar } from "@/components/filters/FilterBar";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { ThemeToggle } from "./ThemeToggle";
import { BrandMark } from "./BrandMark";
import { CommandPalette } from "./CommandPalette";
import { activeDestination, destinations } from "./navigation";

export default function Shell() {
  const location = useLocation();
  const { cohortSearch } = useFilters();
  const realtimeStatus = useRealtimeUpdates();
  
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("edunex-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const title = location.pathname.startsWith("/students/")
    ? "Student 360"
    : (destinations.find((d) => activeDestination(location.pathname, d.to))
        ?.label ?? "Page not found");
  useEffect(() => {
    document.title = `${title} · EduNex`;
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname, title]);
  function toggleSidebar() {
    setCollapsed((current) => {
      try {
        localStorage.setItem("edunex-sidebar-collapsed", String(!current));
      } catch {
        /* The layout also works when browser storage is unavailable. */
      }
      return !current;
    });
  }
  const nav = (mobile = false) =>
    destinations.map(({ to, label, icon: Icon }) => {
      const active = activeDestination(location.pathname, to);
      const link = (
        <Link
          to={`${to}${cohortSearch}`}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={`nav-item ${active ? "active" : ""}`}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
          {active && <i aria-hidden="true" />}
        </Link>
      );
      return mobile ? (
        <DialogClose asChild key={to}>
          {link}
        </DialogClose>
      ) : collapsed ? (
        <Tooltip key={to} content={label}>
          {link}
        </Tooltip>
      ) : (
        <div key={to}>{link}</div>
      );
    });
  return (
    <div className={`app ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <aside className="workspace-sidebar" aria-label="Workspace sidebar">
        <Link
          to={`/dashboard${cohortSearch}`}
          className="workspace-brand"
          aria-label="EduNex overview"
        >
          <BrandMark />
          <span className="brand-wordmark">
            EduNex<span>Campus analytics</span>
          </span>
        </Link>
        <div className="workspace-switcher">
          <span className="workspace-emblem">
            <Building2 size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Institutional workspace</strong>
            <small>Student success platform</small>
          </div>
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Main navigation">{nav()}</nav>

        <div className="workspace-sidebar-bottom">
          <span className="sidebar-brand-note">
            EDUNEX <span>INTELLIGENCE</span>
          </span>
          <Tooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
          </Tooltip>
        </div>
      </aside>
      <header className="workspace-header">
        <Link
          className="mobile-brand"
          to={`/dashboard${cohortSearch}`}
          aria-label="EduNex overview"
        >
          <BrandMark />
          <strong>EduNex</strong>
        </Link>
        <div className="workspace-breadcrumb">
          <span>Workspace</span>
          <ChevronRight size={13} aria-hidden="true" />
          <strong>{title}</strong>
        </div>
        <div className="workspace-header-actions">
          <LiveIndicator status={realtimeStatus} />
          <span className="workspace-divider" />
          <CommandPalette />
          <ThemeToggle />
        </div>
      </header>
      <main className="app-main" id="main-content" tabIndex={-1}>
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
          <div className="route-content" key={location.pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>

        </div>
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {destinations
          .filter((d) =>
            ["/dashboard", "/students", "/risks", "/insights"].includes(d.to),
          )
          .map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={`${to}${cohortSearch}`}
              aria-current={
                activeDestination(location.pathname, to) ? "page" : undefined
              }
              className={
                activeDestination(location.pathname, to) ? "active" : ""
              }
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="mobile-menu-button">
              <Menu size={20} />
              <span>More</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="navigation-dialog">
            <DialogTitle>Explore EduNex</DialogTitle>
            <DialogDescription>
              Student success intelligence, in one place.
            </DialogDescription>
            <nav aria-label="All destinations">{nav(true)}</nav>
            <p className="menu-shortcut">
              <Command size={14} /> Find your next destination with Ctrl+K
            </p>
          </DialogContent>
        </Dialog>
      </nav>
    </div>
  );
}
