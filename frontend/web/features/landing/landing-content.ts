import {
  BookOpen,
  Bot,
  CalendarDays,
  Clock3,
  Files,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Sparkles,
  Video,
} from "lucide-react";

export type LandingModuleId =
  | "dashboard"
  | "projects"
  | "calendar"
  | "pomodoro"
  | "messages"
  | "meetings"
  | "documents"
  | "ai";

interface LandingModule {
  id: LandingModuleId;
  label: string;
  icon: typeof FolderKanban;
  title: string;
  description: string;
}

export const LANDING_MODULES = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    title: "See your workday at a glance.",
    description:
      "Track overdue and today's priorities, upcoming meetings, focus time, active projects, recent notebooks and document storage in one place.",
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderKanban,
    title: "Give every next step a place.",
    description:
      "Turn a shared goal into tasks, assign responsibilities, and follow progress across board, list, schedule and Gantt views.",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    title: "See the shape of your week.",
    description:
      "Bring personal commitments and project tasks into view, with reminders, recurring events and upcoming deadlines to keep you on track.",
  },
  {
    id: "pomodoro",
    label: "Pomodoro",
    icon: Clock3,
    title: "Make time for your next task.",
    description:
      "Focus freely or choose a Calendar or Project task. Settle into a timed session with Zen Mode, session notes and ambient audio, then review your daily reports.",
  },
  {
    id: "messages",
    label: "Messages",
    icon: MessageSquareText,
    title: "Keep the conversation close to the work.",
    description:
      "Discuss ideas in channels and threads, invite members with avatar chips, send independent file copies, and ask AI Bot a question without leaving the conversation.",
  },
  {
    id: "meetings",
    label: "Meetings",
    icon: Video,
    title: "Make room for a shared perspective.",
    description:
      "Schedule a check-in, meet with video and screen sharing, and revisit recordings with AI summaries when available.",
  },
  {
    id: "documents",
    label: "Documents",
    icon: Files,
    title: "Keep the right files within reach.",
    description:
      "Organize files and versions, choose the current version, and manage sharing by email or view-only links. Send independent copies to several existing DMs or one Channel, with results for each destination and retry for failed sends.",
  },
  {
    id: "ai",
    label: "Notebook AI",
    icon: BookOpen,
    title: "Ask questions. Follow the sources.",
    description:
      "Organize private notebooks with descriptions, categories and accent colors. Browse in grid or list view, then explore cited answers with sources and notes beside the conversation.",
  },
] as const satisfies readonly LandingModule[];

export const LANDING_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Product", href: "#product" },
  { label: "AI Assistant", href: "#ai" },
  { label: "FAQs", href: "#faq" },
] as const;

export const LANDING_TRUST_ITEMS = [
  { label: "Projects", icon: FolderKanban },
  { label: "Collaboration", icon: MessageSquareText },
  { label: "Focus", icon: Clock3 },
  { label: "AI-powered", icon: Sparkles },
] as const;

export const LANDING_FEATURE_CARDS = [
  {
    title: "Projects & Tasks",
    description:
      "Organize work with flexible boards, deadlines, assignments and project progress.",
    icon: FolderKanban,
  },
  {
    title: "Messages & Channels",
    description:
      "Keep conversations, file sharing, threads and AI Bot alongside the team.",
    icon: MessageSquareText,
  },
  {
    title: "Calendar & Planning",
    description:
      "Bring events, recurring schedules and project tasks together in one view.",
    icon: CalendarDays,
  },
  {
    title: "Meetings & Calls",
    description:
      "Connect face to face with screen sharing, recordings and AI summaries when available.",
    icon: Video,
  },
  {
    title: "Documents",
    description:
      "Keep project files organized with versions, sharing and accessible references.",
    icon: Files,
  },
  {
    title: "Pomodoro Focus",
    description:
      "Stay in the zone with focused sessions, activity history and task-linked timers.",
    icon: Clock3,
  },
] as const;

export const LANDING_FAQS = [
  {
    question: "Who is WorkspaceHub for?",
    answer:
      "WorkspaceHub is built for students, individuals, and small teams. Use it to coordinate a group assignment, work on a thesis, or organize your everyday projects.",
  },
  {
    question: "Can I use it on my own?",
    answer:
      "Yes. You can organize your documents, manage personal tasks and events in Calendar, and use Pomodoro to focus. Team collaboration is there when you need it.",
  },
  {
    question: "How does team collaboration work?",
    answer:
      "Invite members to a project, assign tasks, and keep discussions in team channels. Share files and schedule meetings alongside your work. Access to projects, documents, and meetings follows the permissions set for each.",
  },
  {
    question: "What can I do with AI?",
    answer:
      "Notebook AI answers questions using selected sources and provides citations. AI Assistant helps you understand tasks and schedules on Dashboard, Projects and Calendar. In Messages, mention @AI Bot or summarize an attachment. Recording owners can generate meeting summaries for people with recording access. Features depend on your settings, permissions and configured services.",
  },
  {
    question: "Are Notebook sources linked to my original files?",
    answer:
      "Sources added to a notebook are private, independent copies. Changing or deleting the original does not update an accepted copy. You can upload supported documents and images directly or choose files you can access in Documents. Each notebook supports up to 5 sources, 20 MiB per file and 50 MiB total.",
  },
  {
    question: "What if AI is unavailable?",
    answer:
      "Read the status shown in the feature and use its retry action after recovery. AI availability depends on the configured services and any applicable limits. AI can make mistakes: check citations, original tasks or recordings before relying on an answer.",
  },
  {
    question: "Where can I find help and keyboard shortcuts?",
    answer:
      "After signing in, open Help & shortcuts from the question-mark button in the header or your user menu. Search task guides, browse troubleshooting and view shortcuts for your current page. Press ? outside text fields and overlays to open Help. App shortcuts can be turned off in the shortcut panel.",
  },
  {
    question: "How do I get started?",
    answer:
      "Create an account, then start with a project or your personal calendar. Add your first task, bring in the documents you need, and invite teammates when you're ready.",
  },
] as const;

export const LANDING_AI_FEATURES = [
  {
    title: "AI Assistant across Dashboard, Projects & Calendar",
    icon: Bot,
  },
  {
    title: "AI Bot in team conversations and threads",
    icon: MessageSquareText,
  },
  {
    title: "Notebook AI with source citations",
    icon: BookOpen,
  },
  {
    title: "Meeting recording summaries when available",
    icon: Video,
  },
] as const;

// Deliberately static sample content. These are not workspace records or metrics.
export const PREVIEW_PROJECT = "Graduation project";
export const PREVIEW_TASK = "Build the research prototype";
export const PREVIEW_MEMBERS = ["Tri", "Linh", "Minh"] as const;
export const PREVIEW_FOCUS_MINUTES = 25;
