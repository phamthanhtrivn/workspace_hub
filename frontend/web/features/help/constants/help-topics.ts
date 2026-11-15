import {
  BookOpen,
  CalendarDays,
  Clock3,
  Files,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Video,
} from "lucide-react";
import type { HelpTopic } from "../types";

export const HELP_TOPICS = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    key: "d",
  },
  {
    id: "projects",
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    key: "p",
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
    key: "c",
  },
  {
    id: "pomodoro",
    label: "Pomodoro",
    href: "/pomodoro",
    icon: Clock3,
    key: "f",
  },
  {
    id: "messages",
    label: "Messages",
    href: "/chat",
    icon: MessageSquareText,
    key: "m",
  },
  {
    id: "meetings",
    label: "Meetings",
    href: "/meetings",
    icon: Video,
    key: "v",
  },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    icon: Files,
    key: "o",
  },
  { id: "ai", label: "Notebook AI", href: "/ai", icon: BookOpen, key: "n" },
  { id: "account", label: "Account & settings", icon: Settings },
] as const;

export function getHelpTopic(pathname: string): HelpTopic | undefined {
  return HELP_TOPICS.find(
    (topic) =>
      "href" in topic &&
      (pathname === topic.href || pathname.startsWith(`${topic.href}/`)),
  )?.id;
}

export function getHelpTopicLabel(topic: HelpTopic | "global") {
  return topic === "global"
    ? "Everywhere"
    : HELP_TOPICS.find((entry) => entry.id === topic)!.label;
}
