import {
  UsersRound,
  MonitorPlay,
  ListChecks,
  BriefcaseBusiness,
  CalendarCheck,
  Database,
  BookMarked,
  MessageSquareText,
} from "lucide-react";

const icons = {
  academic: BookMarked,
  attendance: CalendarCheck,
  lms: MonitorPlay,
  engagement: UsersRound,
  placement: BriefcaseBusiness,
  skills: ListChecks,
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
