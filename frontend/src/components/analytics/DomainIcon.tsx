import {
  Activity,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarCheck,
  Database,
  GraduationCap,
  MessageSquareText,
} from "lucide-react";

const icons = {
  academic: GraduationCap,
  attendance: CalendarCheck,
  lms: BookOpen,
  engagement: Activity,
  placement: BriefcaseBusiness,
  skills: BrainCircuit,
  feedback: MessageSquareText,
};

export function DomainIcon({
  domain,
  size = 18,
}: {
  domain: string;
  size?: number;
}) {
  const key = domain
    .toLowerCase()
    .replace(/_(records|history|information)$/, "");
  const Icon =
    icons[(key === "skill" ? "skills" : key) as keyof typeof icons] ?? Database;
  return <Icon size={size} aria-hidden="true" />;
}
