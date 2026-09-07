import { toast } from "sonner";
import type { SprintCreateValues } from "../components/software-backlog-view";
import { TaskStatus } from "../types/project";

interface SprintActionDependencies {
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
  return {
    createSprint: (values: SprintCreateValues) =>
      runSprintAction(
        () => actions.createSprint(values),
        "Tạo Sprint thành công",
        "Không thể tạo Sprint",
        true,
      ),
    addTasks: (sprintId: string, taskIds: string[]) =>
      runSprintAction(
        () => actions.addTasks({ sprintId, taskIds }),
        "Đã đưa task vào Sprint",
        "Không thể đưa task vào Sprint",
        true,
      ),
    bulkUpdateTasks: (taskIds: string[], status: TaskStatus) =>
      runSprintAction(
        () => Promise.all(taskIds.map((taskId) => actions.updateTasks(taskId, status))),
        `Đã cập nhật ${taskIds.length} task`,
        "Không thể cập nhật hàng loạt task",
        true,
      ),
    updateSprint: (sprintId: string, values: SprintCreateValues) =>
      runSprintAction(
        () => actions.updateSprint({ sprintId, payload: values }),
        "Đã cập nhật Sprint",
        "Không thể cập nhật Sprint",
        true,
      ),
    startSprint: (sprintId: string) =>
      runSprintAction(() => actions.startSprint(sprintId), "Đã Start Sprint", "Không thể Start Sprint"),
    completeSprint: (sprintId: string) =>
      runSprintAction(
        () => actions.completeSprint(sprintId),
        "Đã Complete Sprint; task chưa xong quay lại Backlog",
        "Không thể Complete Sprint",
      ),
    reopenSprint: (sprintId: string) =>
      runSprintAction(
        () => actions.reopenSprint(sprintId),
        "Đã mở lại Sprint ở trạng thái Planned",
        "Không thể mở lại Sprint",
      ),
    removeTask: (sprintId: string, taskId: string) =>
      runSprintAction(
        () => actions.removeTask({ sprintId, taskId }),
        "Đã đưa task về Backlog",
        "Không thể đưa task về Backlog",
        true,
      ),
  };
}
