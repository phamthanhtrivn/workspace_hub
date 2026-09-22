import {
  type ProjectMember,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./types/project";

export interface ProjectTaskFilters {
  searchQuery: string;
  assigneeIds: string[];
  onlyMyIssues: boolean;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  quickAssignee: string;
}

export interface ProjectTaskQuery {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeUserIds?: string;
  unassigned?: boolean;
  onlyMine?: boolean;
}

export function buildProjectTaskQuery(
  filters: ProjectTaskFilters,
): ProjectTaskQuery {
  const search = filters.searchQuery.trim();
  const query: ProjectTaskQuery = {
    ...(search ? { search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.onlyMyIssues ? { onlyMine: true } : {}),
  };

  if (filters.quickAssignee === "UNASSIGNED") {
    return { ...query, unassigned: true };
  }

  const assigneeUserIds = filters.quickAssignee
    ? filters.quickAssignee
    : filters.assigneeIds.join(",");

  return assigneeUserIds ? { ...query, assigneeUserIds } : query;
}

export function enrichProjectTasks(
  tasks: Task[],
  members: ProjectMember[],
  statusOverrides: Record<string, TaskStatus>,
): Task[] {
  const membersById = new Map(members.map((member) => [member.userId, member]));
  return tasks.map((task) => ({
    ...task,
    status: statusOverrides[task.id] || task.status,
    assignees: task.assignees.map((assignee) => {
      const member = membersById.get(assignee.userId);
      return {
        ...assignee,
        displayName: member?.displayName || assignee.displayName,
        avatarUrl: member?.avatarUrl || assignee.avatarUrl,
      };
    }),
  }));
}

export function filterProjectTasks(
  tasks: Task[],
  filters: ProjectTaskFilters & { currentUserId?: string | null },
): Task[] {
  const normalizedSearch = filters.searchQuery.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesSearch =
      !normalizedSearch || task.title.toLowerCase().includes(normalizedSearch);
    const matchesAvatarAssignee =
      filters.assigneeIds.length === 0 ||
      task.assignees.some((assignee) =>
        filters.assigneeIds.includes(assignee.userId),
      );
    const matchesCurrentUser =
      !filters.onlyMyIssues ||
      !filters.currentUserId ||
      task.assignees.some(
        (assignee) => assignee.userId === filters.currentUserId,
      );
    const matchesStatus = !filters.status || task.status === filters.status;
    const matchesPriority =
      !filters.priority || task.priority === filters.priority;
    const matchesQuickAssignee =
      !filters.quickAssignee ||
      (filters.quickAssignee === "UNASSIGNED"
        ? task.assignees.length === 0
        : task.assignees.some(
            (assignee) => assignee.userId === filters.quickAssignee,
          ));
    return (
      matchesSearch &&
      matchesAvatarAssignee &&
      matchesCurrentUser &&
      matchesStatus &&
      matchesPriority &&
      matchesQuickAssignee
    );
  });
}
