export type Audience = "mine" | "projects" | "calendar" | "project";
export type ConversationContext = {
  contextType: "dashboard" | "projects" | "calendar" | "project_detail";
  projectId?: string;
};
export type WorkScope = { projectId?: string; audience: Audience };
export type TaskReference = {
  id: string;
  kind: "project" | "calendar";
  projectId?: string;
  title: string;
  url: string;
  dueAt: string | null;
};
export type WorkMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: TaskReference[];
  created_at: string;
  hidden?: boolean;
  context?: {
    scope: WorkScope;
    fetchedAt: string;
    timeZone: string;
    days: 7 | 30;
  };
};
export type WorkSession = {
  id: string;
  contextType: ConversationContext["contextType"];
  projectId: string | null;
  messages: WorkMessage[];
  nextCursor: string | null;
};
export type WorkConversation = {
  id: string;
  contextType: ConversationContext["contextType"];
  projectId: string | null;
  title: string;
  updatedAt: string;
};
export type WorkConversationPage = {
  sessions: WorkConversation[];
  nextCursor: string | null;
};
