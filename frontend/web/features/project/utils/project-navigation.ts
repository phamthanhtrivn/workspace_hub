import type { ProjectTaskFilters } from "../project-task-view";
import { TaskPriority, TaskStatus } from "../types/project";

export const PROJECT_VIEWS = [
  "overview",
  "board",
  "list",
  "calendar",
  "gantt",
  "documents",
  "members",
] as const;
export type ProjectViewMode = (typeof PROJECT_VIEWS)[number];
export const PROJECT_MEMBER_ROLES = [
  "ALL",
  "ADMIN",
  "MEMBER",
  "PENDING",
] as const;
export type ProjectMemberRoleFilter = (typeof PROJECT_MEMBER_ROLES)[number];
export const PROJECT_DETAIL_QUERY = {
  view: "view",
  search: "search",
  status: "status",
  priority: "priority",
  assignee: "assignee",
  assignees: "assignees",
  onlyMine: "onlyMine",
  taskId: "taskId",
  legacyTask: "task",
  memberSearch: "memberSearch",
  memberRole: "memberRole",
} as const;
export const LEGACY_PROJECT_SETTINGS_VIEW = "settings";
const UUID_PATTERN =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
// Match the existing task-list API limits.
export const PROJECT_TASK_URL_SEARCH_LIMIT = 100;
const MAX_URL_ASSIGNEES = 54;
const UNASSIGNED_FILTER = "UNASSIGNED";

export function parseProjectView(params: URLSearchParams): ProjectViewMode {
  const value = params.get(PROJECT_DETAIL_QUERY.view)?.toLowerCase();

  return PROJECT_VIEWS.find((view) => view === value) ?? "board";
}

export function projectViewQuery(
  params: URLSearchParams,
  view: ProjectViewMode,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (view === "board") next.delete(PROJECT_DETAIL_QUERY.view);
  else next.set(PROJECT_DETAIL_QUERY.view, view);
  next.delete(PROJECT_DETAIL_QUERY.taskId);
  next.delete(PROJECT_DETAIL_QUERY.legacyTask);

  return next;
}

export function parseProjectTaskFilters(
  params: URLSearchParams,
): ProjectTaskFilters {
  const status = params.get(PROJECT_DETAIL_QUERY.status)?.toUpperCase();
  const priority = params.get(PROJECT_DETAIL_QUERY.priority)?.toUpperCase();
  const assignee = params.get(PROJECT_DETAIL_QUERY.assignee) ?? "";
  const quickAssignee =
    assignee.toUpperCase() === UNASSIGNED_FILTER
      ? UNASSIGNED_FILTER
      : UUID_PATTERN.test(assignee)
        ? assignee.toLowerCase()
        : "";
  const assigneeIds = quickAssignee
    ? []
    : [
        ...new Set(
          (params.get(PROJECT_DETAIL_QUERY.assignees) ?? "")
            .split(",")
            .filter((id) => UUID_PATTERN.test(id))
            .map((id) => id.toLowerCase()),
        ),
      ].slice(0, MAX_URL_ASSIGNEES);

  return {
    searchQuery: (params.get(PROJECT_DETAIL_QUERY.search) ?? "").slice(
      0,
      PROJECT_TASK_URL_SEARCH_LIMIT,
    ),
    status: Object.values(TaskStatus).find((value) => value === status) ?? "",
    priority:
      Object.values(TaskPriority).find((value) => value === priority) ?? "",
    quickAssignee,
    assigneeIds,
    onlyMyIssues: ["1", "true"].includes(
      params.get(PROJECT_DETAIL_QUERY.onlyMine) ?? "",
    ),
  };
}

export function projectTaskFilterQuery(
  params: URLSearchParams,
  filters: ProjectTaskFilters,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const entries = {
    [PROJECT_DETAIL_QUERY.search]: filters.searchQuery,
    [PROJECT_DETAIL_QUERY.status]: filters.status,
    [PROJECT_DETAIL_QUERY.priority]: filters.priority,
    [PROJECT_DETAIL_QUERY.assignee]: filters.quickAssignee,
    [PROJECT_DETAIL_QUERY.assignees]: filters.quickAssignee
      ? ""
      : filters.assigneeIds.join(","),
    [PROJECT_DETAIL_QUERY.onlyMine]: filters.onlyMyIssues ? "1" : "",
  };
  for (const [key, value] of Object.entries(entries)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }

  return next;
}

export function parseProjectMemberFilters(params: URLSearchParams) {
  const role = params.get(PROJECT_DETAIL_QUERY.memberRole)?.toUpperCase();

  return {
    searchQuery: params.get(PROJECT_DETAIL_QUERY.memberSearch) ?? "",
    role: PROJECT_MEMBER_ROLES.find((value) => value === role) ?? "ALL",
  };
}

export function canonicalizeProjectQuery(
  params: URLSearchParams,
): URLSearchParams {
  const next = projectTaskFilterQuery(params, parseProjectTaskFilters(params));
  const view = parseProjectView(params);
  // Keep settings as the existing one-time deep link, without adding modal URL state.
  if (params.get(PROJECT_DETAIL_QUERY.view) !== LEGACY_PROJECT_SETTINGS_VIEW) {
    if (view === "board") next.delete(PROJECT_DETAIL_QUERY.view);
    else next.set(PROJECT_DETAIL_QUERY.view, view);
  }
  const memberFilters = parseProjectMemberFilters(params);
  if (memberFilters.role === "ALL")
    next.delete(PROJECT_DETAIL_QUERY.memberRole);
  else
    next.set(PROJECT_DETAIL_QUERY.memberRole, memberFilters.role.toLowerCase());
  if (!memberFilters.searchQuery)
    next.delete(PROJECT_DETAIL_QUERY.memberSearch);

  return next;
}
