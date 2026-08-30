import {
  TaskType,
  type ProjectMember,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "./types/project";

export interface ProjectTaskFilters {
  searchQuery: string;
  assigneeIds: string[];
  onlyMyIssues: boolean;
  currentUserId?: string | null;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  quickAssignee: string;
  kind: "ALL" | "PARENT" | "TASK" | "SUBTASK";
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
  filters: ProjectTaskFilters,
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
    const matchesKind =
      filters.kind === "ALL" ||
      (filters.kind === "PARENT" && task.taskType === TaskType.EPIC) ||
      (filters.kind === "SUBTASK" && task.taskType === TaskType.SUBTASK) ||
      (filters.kind === "TASK" &&
        [TaskType.TASK, TaskType.BUG, TaskType.STORY].includes(task.taskType));

    return (
      matchesSearch &&
      matchesAvatarAssignee &&
      matchesCurrentUser &&
      matchesStatus &&
      matchesPriority &&
      matchesQuickAssignee &&
      matchesKind
    );
  });
}
