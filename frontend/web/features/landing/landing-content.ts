import {
  CalendarDays, FileText, FolderKanban, MessageSquare, Timer, Video,
} from "lucide-react";

export type LandingModuleId =
  | "projects" | "messages" | "meetings" | "documents" | "calendar" | "pomodoro";

interface LandingModule {
  id: LandingModuleId;
  label: string;
  icon: typeof FolderKanban;
  title: string;
  description: string;
}

export const LANDING_MODULES = [
  { id: "projects", label: "Projects", icon: FolderKanban, title: "Give every next step a place.", description: "Turn a shared goal into tasks, assign responsibilities, and follow progress from the first idea to the final hand-in." },
  { id: "messages", label: "Messages", icon: MessageSquare, title: "Keep the conversation close to the work.", description: "Discuss ideas in channels and threads, share documents, and create project tasks right from your team's chat." },
  { id: "meetings", label: "Meetings", icon: Video, title: "Make room for a shared perspective.", description: "Schedule a check-in, meet with video, and share your screen when a conversation needs more than a message." },
  { id: "documents", label: "Documents", icon: FileText, title: "Keep the right files within reach.", description: "Organize research, manage file versions, and attach relevant documents to the tasks and events that need them." },
  { id: "calendar", label: "Calendar", icon: CalendarDays, title: "See the shape of your week.", description: "Bring personal commitments and project tasks into view, with reminders and recurring events to keep you on track." },
  { id: "pomodoro", label: "Pomodoro", icon: Timer, title: "Make time for your next task.", description: "Choose a project or calendar task, settle into a focus session, and keep a history of the time you put in." },
] as const satisfies readonly LandingModule[];

export const LANDING_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "FAQ", href: "#faq" },
] as const;

export const LANDING_FAQS = [
  { question: "Who is WorkspaceHub for?", answer: "WorkspaceHub is built for students, individuals, and small teams. Use it to coordinate a group assignment, work on a thesis, or organize your everyday projects." },
  { question: "Can I use it on my own?", answer: "Yes. You can organize your documents, manage personal tasks and events in Calendar, and use Pomodoro to focus. Team collaboration is there when you need it." },
  { question: "How does team collaboration work?", answer: "Invite members to a project, assign tasks, and keep discussions in team channels. Share files and schedule meetings alongside your work. Access to projects, documents, and meetings follows the permissions set for each." },
  { question: "How do I get started?", answer: "Create an account, then start with a project or your personal calendar. Add your first task, bring in the documents you need, and invite teammates when you're ready." },
] as const;

// Deliberately static sample content. These are not workspace records or metrics.
export const PREVIEW_PROJECT = "Graduation project";
export const PREVIEW_TASK = "Build the research prototype";
export const PREVIEW_MEMBERS = ["Tri", "Linh", "Minh"] as const;
export const PREVIEW_FOCUS_MINUTES = 25;
