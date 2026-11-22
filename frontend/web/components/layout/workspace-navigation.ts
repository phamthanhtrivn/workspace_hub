import {
  BookOpen,
  CalendarDays,
  Clock3,
  Files,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Video,
} from "lucide-react";

export const WORKSPACE_NAVIGATION_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview & Analytics",
    icon: LayoutDashboard,
  },
  {
    href: "/projects",
    label: "Projects",
    description: "Tasks & Workflows",
    icon: FolderKanban,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "Events & Schedules",
    icon: CalendarDays,
  },
  {
    href: "/pomodoro",
    label: "Pomodoro",
    description: "Focus & Time Tracker",
    icon: Clock3,
  },
  {
    href: "/chat",
    label: "Messages",
    description: "Team Channels & DMs",
    icon: MessageSquareText,
  },
  {
    href: "/meetings",
    label: "Meetings",
    description: "Video Calls & Rooms",
    icon: Video,
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Notes & File Storage",
    icon: Files,
  },
  {
    href: "/ai",
    label: "Notebook AI",
    description: "Sources, Chat & Studio",
    icon: BookOpen,
  },
] as const;

export function isWorkspaceRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
