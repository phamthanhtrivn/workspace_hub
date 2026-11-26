import {
  BookOpen, Bot, CalendarDays, FileText, FolderKanban, MessageSquare, Timer, Video,
} from "lucide-react";

export type LandingModuleId =
  | "projects" | "messages" | "meetings" | "documents" | "calendar" | "pomodoro" | "ai";

interface LandingModule {
  id: LandingModuleId;
  label: string;
  icon: typeof FolderKanban;
  title: string;
  description: string;
}

export const LANDING_MODULES = [
  { id: "projects", label: "Projects", icon: FolderKanban, title: "Give every next step a place.", description: "Turn a shared goal into tasks, assign responsibilities, and follow progress from the first idea to the final hand-in." },
  { id: "messages", label: "Messages", icon: MessageSquare, title: "Keep the conversation close to the work.", description: "Discuss ideas in channels and threads, invite members with avatar chips, send independent file copies, and ask AI Bot a question without leaving the conversation." },
  { id: "meetings", label: "Meetings", icon: Video, title: "Make room for a shared perspective.", description: "Schedule a check-in, meet with video and screen sharing, and revisit recordings with AI summaries when available." },
  { id: "documents", label: "Documents", icon: FileText, title: "Keep the right files within reach.", description: "Organize files and versions, choose the current version, and manage sharing by email or view-only links. Send independent copies to several existing DMs or one Channel, with results for each destination and retry for failed sends." },
  { id: "calendar", label: "Calendar", icon: CalendarDays, title: "See the shape of your week.", description: "Bring personal commitments and project tasks into view, with reminders and recurring events to keep you on track." },
  { id: "pomodoro", label: "Pomodoro", icon: Timer, title: "Make time for your next task.", description: "Focus freely or choose a Calendar or Project task. Settle into a timed session with ambient audio, then review your daily activity and session reports." },
  { id: "ai", label: "Notebook AI", icon: BookOpen, title: "Ask questions. Follow the sources.", description: "Organize private notebooks with descriptions, categories and accent colors. Browse in grid or list view, then explore cited answers with sources and notes beside the conversation." },
] as const satisfies readonly LandingModule[];

export const LANDING_LINKS = [
  { label: "Product", href: "#product" },
  { label: "AI", href: "#ai" },
  { label: "Workflow", href: "#workflow" },
  { label: "FAQ", href: "#faq" },
] as const;

export const LANDING_FAQS = [
  { question: "Who is WorkspaceHub for?", answer: "WorkspaceHub is built for students, individuals, and small teams. Use it to coordinate a group assignment, work on a thesis, or organize your everyday projects." },
  { question: "Can I use it on my own?", answer: "Yes. You can organize your documents, manage personal tasks and events in Calendar, and use Pomodoro to focus. Team collaboration is there when you need it." },
  { question: "How does team collaboration work?", answer: "Invite members to a project, assign tasks, and keep discussions in team channels. Share files and schedule meetings alongside your work. Access to projects, documents, and meetings follows the permissions set for each." },
  { question: "What can I do with AI?", answer: "Notebook AI answers questions using selected sources and provides citations. AI Assistant helps you understand tasks and schedules on Dashboard, Projects and Calendar. In Messages, mention @AI Bot or summarize an attachment. Recording owners can generate meeting summaries for people with recording access. Features depend on your settings, permissions and configured services." },
  { question: "Are Notebook sources linked to my original files?", answer: "Sources added to a notebook are private, independent copies. Changing or deleting the original does not update an accepted copy. You can upload supported documents and images directly or choose files you can access in Documents. Each notebook supports up to 5 sources, 20 MiB per file and 50 MiB total." },
  { question: "What if AI is unavailable?", answer: "Read the status shown in the feature and use its retry action after recovery. AI availability depends on the configured services and any applicable limits. AI can make mistakes: check citations, original tasks or recordings before relying on an answer." },
  { question: "Where can I find help and keyboard shortcuts?", answer: "After signing in, open Help & shortcuts from the question-mark button in the header or your user menu. Search task guides, browse troubleshooting and view shortcuts for your current page. Press ? outside text fields and overlays to open Help. App shortcuts can be turned off in the shortcut panel." },
  { question: "How do I get started?", answer: "Create an account, then start with a project or your personal calendar. Add your first task, bring in the documents you need, and invite teammates when you're ready." },
] as const;

export const LANDING_AI_FEATURES = [
  { title: "Research with your sources", location: "Notebook AI", icon: BookOpen, description: "Upload documents and images, choose your sources, and ask questions with citations you can inspect. Keep findings in notebook notes.", example: "What do these interview notes say about our prototype?" },
  { title: "Understand the work ahead", location: "Dashboard, Projects & Calendar", icon: Bot, description: "Ask AI Assistant about tasks, deadlines and your schedule. Return to earlier conversations when you want to continue planning.", example: "Which tasks need my attention this week?" },
  { title: "Keep questions in the conversation", location: "Messages & threads", icon: MessageSquare, description: "Mention @AI Bot in a new message for a contextual reply, or summarize a selected attachment. Reopen a saved summary when you need it.", example: "@AI Bot What did we agree to review next?" },
  { title: "Revisit the discussion", location: "Meeting recordings", icon: Video, description: "Recording owners can request a summary of transcribed speech. People with recording access can read the saved result and check it against the recording.", example: "Review the discussion, then verify decisions in the recording." },
] as const;

// Deliberately static sample content. These are not workspace records or metrics.
export const PREVIEW_PROJECT = "Graduation project";
export const PREVIEW_TASK = "Build the research prototype";
export const PREVIEW_MEMBERS = ["Tri", "Linh", "Minh"] as const;
export const PREVIEW_FOCUS_MINUTES = 25;
