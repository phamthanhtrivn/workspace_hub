import { useQuery } from "@tanstack/react-query";
import { getTask } from "../api/task.api";
import type { Task } from "../types/project";
import { isProjectResourceId } from "../utils/project-task-link";

export function useLinkedProjectTask(
  projectId: string,
  taskId: string | null,
  tasks: Task[],
  enabled: boolean,
) {
  const listedTask = tasks.find(task => task.id === taskId);
  const validIds = Boolean(taskId && isProjectResourceId(taskId) && isProjectResourceId(projectId));
  const query = useQuery({
    queryKey: ["projects", projectId, "linked-task", taskId],
    queryFn: async () => {
      if (!taskId || !validIds) throw new Error("Invalid task link");
      const task = await getTask(taskId);
      if (task.projectId !== projectId) throw new Error("Task does not belong to this project");
      return task;
    },
    enabled: enabled && validIds && !listedTask,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return {
    ...query,
    isError: query.isError || Boolean(taskId && !validIds),
    task: listedTask ?? (query.isError ? undefined : query.data),
  };
}
