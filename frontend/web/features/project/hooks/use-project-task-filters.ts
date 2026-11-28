import { useMemo, useState, type SetStateAction } from "react";
import { useUrlQuery } from "@/hooks/use-url-query";
import type { ProjectTaskFilters } from "../project-task-view";
import {
  parseProjectTaskFilters,
  projectTaskFilterQuery,
} from "../utils/project-navigation";
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
  const { params, updateQuery } = useUrlQuery();
  const query = params.toString();
  const {
    searchQuery,
    assigneeIds,
    status,
    priority,
    quickAssignee,
    onlyMyIssues,
  } = useMemo(
    () => parseProjectTaskFilters(new URLSearchParams(query)),
    [query],
  );
  const setFilter = <Key extends keyof ProjectTaskFilters>(
    key: Key,
    value: SetStateAction<ProjectTaskFilters[Key]>,
  ) =>
    updateQuery(
      (current) => {
        const filters = parseProjectTaskFilters(current);
        const nextValue =
          typeof value === "function" ? value(filters[key]) : value;

        return projectTaskFilterQuery(current, {
          ...filters,
          [key]: nextValue,
        });
      },
      key === "searchQuery" ? "replace" : "push",
    );
  const debouncedSearchQuery = useDebouncedValue(
    searchQuery,
    PROJECT_TASK_SEARCH_DEBOUNCE_MS,
  );
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, TaskStatus>
  >({});

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
    updateQuery((current) => {
      const filters = parseProjectTaskFilters(current);

      return projectTaskFilterQuery(current, {
        ...filters,
        quickAssignee: "",
        assigneeIds: filters.assigneeIds.includes(userId)
          ? filters.assigneeIds.filter((id) => id !== userId)
          : [...filters.assigneeIds, userId],
      });
    }, "push");
  };
  const clear = () => {
    updateQuery(
      (current) =>
        projectTaskFilterQuery(
          current,
          parseProjectTaskFilters(new URLSearchParams()),
        ),
      "push",
    );
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
    setSearchQuery: (value: string) => setFilter("searchQuery", value),
    assigneeIds,
    status,
    setStatus: (value: TaskStatus | "") => setFilter("status", value),
    priority,
    setPriority: (value: TaskPriority | "") => setFilter("priority", value),
    quickAssignee,
    setQuickAssignee: (value: string) =>
      updateQuery(
        (current) =>
          projectTaskFilterQuery(current, {
            ...parseProjectTaskFilters(current),
            quickAssignee: value,
            assigneeIds: [],
          }),
        "push",
      ),
    onlyMyIssues,
    setOnlyMyIssues: (value: SetStateAction<boolean>) =>
      setFilter("onlyMyIssues", value),
    statusOverrides,
    setStatusOverrides,
    toggleAssignee,
    clear,
    isActive,
  };
}
