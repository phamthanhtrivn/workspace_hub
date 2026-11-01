/** Public, generic copy shared by server metadata and the browser title manager. */
export const SITE_NAME = "WorkspaceHub";
export const HOME_TITLE = "WorkspaceHub — Projects, Tasks & Team Collaboration";

export const PAGE_METADATA = {
  "/": {
    title: HOME_TITLE,
    description: "Manage projects, tasks, calendars, documents, team conversations and focus sessions in one connected workspace with WorkspaceHub.",
  },
  "/login": {
    title: "Sign In",
    description: "Sign in to WorkspaceHub to access your projects, tasks, documents and team conversations.",
  },
  "/register": {
    title: "Create Account",
    description: "Create a WorkspaceHub account to organize your work and collaborate with your team in one place.",
  },
  "/forgot-password": {
    title: "Reset Password",
    description: "Reset your WorkspaceHub password and recover access to your account securely.",
  },
  "/dashboard": {
    title: "Dashboard",
    description: "Review your schedule, task priorities, focus time and recent workspace activity in your WorkspaceHub dashboard.",
  },
  "/projects": {
    title: "Projects",
    description: "Organize your projects, track progress and collaborate with project members in WorkspaceHub.",
  },
  "/projects/[id]": {
    title: "Project Details",
    description: "Manage project tasks, boards, schedules, documents and members in your WorkspaceHub project.",
  },
  "/projects/invitations": {
    title: "Project Invitations",
    description: "Review and respond to invitations to collaborate on projects in WorkspaceHub.",
  },
  "/tasks": {
    title: "Tasks",
    description: "Find your task workflows across Projects, Calendar and Dashboard in WorkspaceHub.",
  },
  "/calendar": {
    title: "Calendar",
    description: "Plan your schedule and manage calendar events, tasks and deadlines in WorkspaceHub.",
  },
  "/pomodoro": {
    title: "Pomodoro Timer",
    description: "Stay focused with timed work sessions, planned breaks and task tracking in WorkspaceHub.",
  },
  "/chat": {
    title: "Messages",
    description: "Collaborate through team channels, direct messages and conversation threads in WorkspaceHub.",
  },
  "/meetings": {
    title: "Meetings",
    description: "Create, join and manage your team meetings in WorkspaceHub.",
  },
  "/meetings/[joinToken]": {
    title: "Meeting Room",
    description: "Join a WorkspaceHub meeting using your existing meeting access permissions.",
  },
  "/documents": {
    title: "Documents",
    description: "Organize, find and share files, folders and project documents in WorkspaceHub.",
  },
  "/documents/shared/[id]": {
    title: "Shared Document",
    description: "Open a document shared through WorkspaceHub using the access granted by its owner.",
  },
  "/ai": {
    title: "Notebook AI",
    description: "Organize research notebooks, add sources, ask questions grounded in your documents and save notes in WorkspaceHub.",
  },
  "/ai/notebooks/[id]": {
    title: "Notebook AI",
    description: "Work with notebook sources, explore cited answers and save research notes in your WorkspaceHub notebook.",
  },
} as const;

export type MetadataPage = keyof typeof PAGE_METADATA;

export function getPageTitle(pathname: string): string {
  const path = pathname.replace(/\/$/, "") || "/";
  let page: MetadataPage | undefined;
  if (Object.hasOwn(PAGE_METADATA, path)) page = path as MetadataPage;
  else if (/^\/projects\/[^/]+$/.test(path)) page = "/projects/[id]";
  else if (/^\/meetings\/[^/]+$/.test(path)) page = "/meetings/[joinToken]";
  else if (/^\/documents\/shared\/[^/]+$/.test(path)) page = "/documents/shared/[id]";
  else if (/^\/ai\/notebooks\/[^/]+$/.test(path)) page = "/ai/notebooks/[id]";

  if (!page) return SITE_NAME;
  return page === "/" ? HOME_TITLE : `${PAGE_METADATA[page].title} | ${SITE_NAME}`;
}
