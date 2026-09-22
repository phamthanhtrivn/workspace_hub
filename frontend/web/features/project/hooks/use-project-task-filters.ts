import { useMemo, useState } from "react";
import {
  buildProjectTaskQuery,
  enrichProjectTasks,
} from "../project-task-view";
import { PROJECT_TASK_SEARCH_DEBOUNCE_MS } from "../constants/project.constants";
import { useDebouncedValue } from "./use-debounced-value";
import {
  TaskPriority,
  TaskStatus,
  type ProjectMember,
  type Task,
} from "../types/project";

export function useProjectTaskFilters(
  serverTasks: Task[],
  members: ProjectMember[],
) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(
    searchQuery,
    PROJECT_TASK_SEARCH_DEBOUNCE_MS,
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [quickAssignee, setQuickAssignee] = useState("");
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TaskStatus>>({});

  const tasks = useMemo(
    () => enrichProjectTasks(serverTasks, members, statusOverrides),
    [members, serverTasks, statusOverrides],
  );
  const taskQuery = useMemo(
    () =>
      buildProjectTaskQuery({
        searchQuery: debouncedSearchQuery,
        assigneeIds,
        onlyMyIssues,
        status,
        priority,
        quickAssignee,
      }),
    [
      assigneeIds,
      debouncedSearchQuery,
      onlyMyIssues,
      priority,
      quickAssignee,
      status,
    ],
  );
  const hasApiFilters = Object.keys(taskQuery).length > 0;

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
  };
  const isActive =
    assigneeIds.length > 0 ||
    onlyMyIssues ||
    searchQuery.length > 0 ||
    status !== "" ||
    priority !== "" ||
    quickAssignee !== "";

  return {
    tasks,
    taskQuery,
    hasApiFilters,
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
    onlyMyIssues,
    setOnlyMyIssues,
    statusOverrides,
    setStatusOverrides,
    toggleAssignee,
    clear,
    isActive,
  };
}
