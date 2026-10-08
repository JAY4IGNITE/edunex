import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Layers3,
  Sparkles,
  Database,
} from "lucide-react";

export const destinations = [
  {
    to: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    detail: "Student success overview",
  },
  {
    to: "/students",
    label: "Students",
    icon: Users,
    detail: "Explore student profiles",
  },
  {
    to: "/risks",
    label: "Risks",
    icon: ShieldAlert,
    detail: "View high risk students",
  },
  {
    to: "/segments",
    label: "Segments",
    icon: Layers3,
    detail: "Understand student groups",
  },
  {
    to: "/insights",
    label: "Insights",
    icon: Sparkles,
    detail: "Explore trends and signals",
  },
  {
    to: "/data",
    label: "Data Integration",
    icon: Database,
    detail: "Sources, quality and provenance",
  },
];

export function activeDestination(path: string, destination: string) {
  return destination === "/dashboard"
    ? path === "/" || path === "/dashboard"
    : path === destination || path.startsWith(`${destination}/`);
}
