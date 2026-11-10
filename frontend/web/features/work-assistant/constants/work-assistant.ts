import type { Audience, ConversationContext, WorkScope } from "../types";

export function conversationContext(
  projectId: string | undefined,
  audience: Audience,
): ConversationContext {
  return {
    contextType: projectId
      ? "project_detail"
      : audience === "projects" || audience === "calendar"
        ? audience
        : "dashboard",
    ...(projectId ? { projectId } : {}),
  };
}

export function conversationContextKey(
  projectId: string | undefined,
  audience: Audience,
) {
  const context = conversationContext(projectId, audience);

  return `${context.contextType}:${projectId ?? ""}`;
}

export const WORK_SUGGESTIONS = [
  { label: "Plan my day", question: "What should I work on first today?" },
  {
    label: "Check deadlines",
    question: "Which tasks are at risk of missing their deadline?",
  },
  {
    label: "Review my progress",
    question: "Review my productivity over the past 7 days.",
  },
  {
    label: "Find focus time",
    question: "Suggest focus time based on my Calendar.",
  },
] as const;

export const WORK_CONTEXT_LABELS = {
  ALL_MY_TASKS: "My tasks · Projects & Calendar",
  ALL_PROJECTS: "My tasks · All projects",
  CURRENT_PROJECT: "My tasks · Current project",
  CALENDAR: "My tasks · Calendar",
} as const;

export const WORK_MESSAGE_SCOPE_LABELS = {
  ALL_MY_TASKS: "My tasks",
  ALL_PROJECTS: "All projects",
  CURRENT_PROJECT: "Current project",
  CALENDAR: "Calendar",
} as const;

export interface ResolvedWorkContext {
  projectId?: string;
  audience: Audience;
  label: string;
}

export function resolveWorkContext(pathname: string): ResolvedWorkContext {
  const projectId = /^\/projects\/([0-9a-f-]{36})(?:\/|$)/i
    .exec(pathname)?.[1]
    ?.toLowerCase();

  if (projectId) {
    return {
      projectId,
      audience: "mine",
      label: WORK_CONTEXT_LABELS.CURRENT_PROJECT,
    };
  }

  if (pathname === "/projects" || pathname.startsWith("/projects/")) {
    return {
      audience: "projects",
      label: WORK_CONTEXT_LABELS.ALL_PROJECTS,
    };
  }

  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) {
    return {
      audience: "calendar",
      label: WORK_CONTEXT_LABELS.CALENDAR,
    };
  }

  return {
    audience: "mine",
    label: WORK_CONTEXT_LABELS.ALL_MY_TASKS,
  };
}

export function formatMessageScopeLabel(scope: WorkScope): string {
  if (scope.projectId) return WORK_MESSAGE_SCOPE_LABELS.CURRENT_PROJECT;
  if (scope.audience === "projects")
    return WORK_MESSAGE_SCOPE_LABELS.ALL_PROJECTS;
  if (scope.audience === "calendar") return WORK_MESSAGE_SCOPE_LABELS.CALENDAR;

  return WORK_MESSAGE_SCOPE_LABELS.ALL_MY_TASKS;
}
