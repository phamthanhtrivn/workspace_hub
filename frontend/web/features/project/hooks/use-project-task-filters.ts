import { useMemo, useState } from "react";
import type { TaskKindFilter } from "../components/task-quick-filters";
import { enrichProjectTasks, filterProjectTasks } from "../project-task-view";
import {
  TaskPriority,
  TaskStatus,
  type ProjectMember,
  type Task,
} from "../types/project";

export function useProjectTaskFilters(
  serverTasks: Task[],
  members: ProjectMember[],
  currentUserId?: string | null,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [quickAssignee, setQuickAssignee] = useState("");
  const [kind, setKind] = useState<TaskKindFilter>("ALL");
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TaskStatus>>({});

  const tasks = useMemo(
    () => enrichProjectTasks(serverTasks, members, statusOverrides),
    [members, serverTasks, statusOverrides],
  );
  const filteredTasks = useMemo(
    () =>
      filterProjectTasks(tasks, {
        searchQuery,
        assigneeIds,
        onlyMyIssues,
        currentUserId,
        status,
        priority,
        quickAssignee,
        kind,
      }),
    [
      assigneeIds,
      currentUserId,
      kind,
      onlyMyIssues,
      priority,
      quickAssignee,
      searchQuery,
      status,
      tasks,
    ],
  );

  const toggleAssignee = (userId: string) => {
    setQuickAssignee("");
    setAssigneeIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };
  const clear = () => {
    setAssigneeIds([]);
    setOnlyMyIssues(false);
    setSearchQuery("");
    setStatus("");
    setPriority("");
    setQuickAssignee("");
    setKind("ALL");
  };
  const isActive =
    assigneeIds.length > 0 ||
    onlyMyIssues ||
    searchQuery.length > 0 ||
    status !== "" ||
    priority !== "" ||
    quickAssignee !== "" ||
    kind !== "ALL";

  return {
    tasks,
    filteredTasks,
    searchQuery,
    setSearchQuery,
    assigneeIds,
    setAssigneeIds,
    status,
    setStatus,
    priority,
    setPriority,
    quickAssignee,
    setQuickAssignee,
    kind,
    setKind,
    onlyMyIssues,
    setOnlyMyIssues,
    statusOverrides,
    setStatusOverrides,
    toggleAssignee,
    clear,
    isActive,
  };
}
