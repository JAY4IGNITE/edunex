import {
  LayoutDashboard,
  ContactRound,
  TriangleAlert,
  ChartScatter,
  ChartNoAxesCombined,
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
    icon: ContactRound,
    detail: "Explore student profiles",
  },
  {
    to: "/risks",
    label: "Risks",
    icon: TriangleAlert,
    detail: "View high risk students",
  },
  {
    to: "/segments",
    label: "Segments",
    icon: ChartScatter,
    detail: "Understand student groups",
  },
  {
    to: "/insights",
    label: "Insights",
    icon: ChartNoAxesCombined,
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
