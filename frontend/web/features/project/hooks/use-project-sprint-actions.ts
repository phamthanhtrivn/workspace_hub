import { toast } from "sonner";
import type { SprintCreateValues } from "../components/views/software-backlog-view";
import { TaskStatus } from "../types/project";

interface SprintActionDependencies {
  formatMessage: (id: string, values?: Record<string, number>) => string;
  createSprint: (values: SprintCreateValues) => Promise<unknown>;
  addTasks: (input: { sprintId: string; taskIds: string[] }) => Promise<unknown>;
  updateTasks: (taskId: string, status: TaskStatus) => Promise<unknown>;
  updateSprint: (input: { sprintId: string; payload: SprintCreateValues }) => Promise<unknown>;
  startSprint: (sprintId: string) => Promise<unknown>;
  completeSprint: (sprintId: string) => Promise<unknown>;
  reopenSprint: (sprintId: string) => Promise<unknown>;
  removeTask: (input: { sprintId: string; taskId: string }) => Promise<unknown>;
}

async function runSprintAction(
  action: () => Promise<unknown>,
  successMessage: string,
  errorMessage: string,
  rethrow = false,
) {
  try {
    await action();
    toast.success(successMessage);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : errorMessage);
    if (rethrow) throw error;
  }
}

export function createProjectSprintActions(actions: SprintActionDependencies) {
  const message = actions.formatMessage;
  return {
    createSprint: (values: SprintCreateValues) =>
      runSprintAction(
        () => actions.createSprint(values),
        message("project.sprint.created"),
        message("project.sprint.createFailed"),
        true,
      ),
    addTasks: (sprintId: string, taskIds: string[]) =>
      runSprintAction(
        () => actions.addTasks({ sprintId, taskIds }),
        message("project.sprint.tasksAdded"),
        message("project.sprint.addTasksFailed"),
        true,
      ),
    bulkUpdateTasks: (taskIds: string[], status: TaskStatus) =>
      runSprintAction(
        () => Promise.all(taskIds.map((taskId) => actions.updateTasks(taskId, status))),
        message("project.task.bulkUpdated", { count: taskIds.length }),
        message("project.task.bulkUpdateFailed"),
        true,
      ),
    updateSprint: (sprintId: string, values: SprintCreateValues) =>
      runSprintAction(
        () => actions.updateSprint({ sprintId, payload: values }),
        message("project.sprint.updated"),
        message("project.sprint.updateFailed"),
        true,
      ),
    startSprint: (sprintId: string) =>
      runSprintAction(
        () => actions.startSprint(sprintId),
        message("project.sprint.started"),
        message("project.sprint.startFailed"),
      ),
    completeSprint: (sprintId: string) =>
      runSprintAction(
        () => actions.completeSprint(sprintId),
        message("project.sprint.completed"),
        message("project.sprint.completeFailed"),
      ),
    reopenSprint: (sprintId: string) =>
      runSprintAction(
        () => actions.reopenSprint(sprintId),
        message("project.sprint.reopened"),
        message("project.sprint.reopenFailed"),
      ),
    removeTask: (sprintId: string, taskId: string) =>
      runSprintAction(
        () => actions.removeTask({ sprintId, taskId }),
        message("project.backlog.taskReturned"),
        message("project.backlog.returnTaskFailed"),
        true,
      ),
  };
}
