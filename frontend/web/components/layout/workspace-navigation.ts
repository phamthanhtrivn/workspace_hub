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

export type WorkspaceNavItemId =
  | "dashboard"
  | "projects"
  | "calendar"
  | "pomodoro"
  | "messages"
  | "meetings"
  | "documents"
  | "ai";

export const WORKSPACE_NAVIGATION_ITEMS = [
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview & Analytics",
    icon: LayoutDashboard,
  },
  {
    id: "projects",
    href: "/projects",
    label: "Projects",
    description: "Tasks & Workflows",
    icon: FolderKanban,
  },
  {
    id: "calendar",
    href: "/calendar",
    label: "Calendar",
    description: "Events & Schedules",
    icon: CalendarDays,
  },
  {
    id: "pomodoro",
    href: "/pomodoro",
    label: "Pomodoro",
    description: "Focus & Time Tracker",
    icon: Clock3,
  },
  {
    id: "messages",
    href: "/chat",
    label: "Messages",
    description: "Team Channels & DMs",
    icon: MessageSquareText,
  },
  {
    id: "meetings",
    href: "/meetings",
    label: "Meetings",
    description: "Video Calls & Rooms",
    icon: Video,
  },
  {
    id: "documents",
    href: "/documents",
    label: "Documents",
    description: "Notes & File Storage",
    icon: Files,
  },
  {
    id: "ai",
    href: "/ai",
    label: "Notebook AI",
    description: "Sources, Chat & Studio",
    icon: BookOpen,
  },
] as const;

export function isWorkspaceRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
