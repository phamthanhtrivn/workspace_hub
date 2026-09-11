import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import type { CreateTaskPayload, UpdateTaskPayload } from "./api/task.api";
import type { SprintFormValues } from "./components/dialogs/sprint-edit-dialog";
import { confirmProjectAction } from "./project-alert";
import { TaskStatus, type Task } from "./types/project";
import { toApiDateTime } from "./utils/task-dates";
import { getProjectErrorMessage } from "./project-error-message";

interface ProjectGroupActionDependencies {
  formatMessage: (
    id: string,
    values?: Record<string, string | number>,
  ) => string;
  tasks: Task[];
  editingGroup: Task | null;
  setEditingGroup: Dispatch<SetStateAction<Task | null>>;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  rejectChange: (taskId: string) => boolean;
  createTask: (payload: CreateTaskPayload) => Promise<Task>;
  updateTask: (input: { taskId: string; payload: UpdateTaskPayload }) => Promise<unknown>;
  addTasksToSprint: (input: { sprintId: string; taskIds: string[] }) => Promise<unknown>;
}

export function createProjectGroupActions(deps: ProjectGroupActionDependencies) {
  const message = deps.formatMessage;
  const editGroup = (group: Task) => {
    if (deps.rejectChange(group.id)) return;
    deps.setSelectedTask(null);
    deps.setEditingGroup(group);
  };

  const submitGroup = async (values: SprintFormValues) => {
    if (!deps.editingGroup) return;
    try {
      await deps.updateTask({
        taskId: deps.editingGroup.id,
        payload: {
          title: values.name,
          startDate: toApiDateTime(values.startDate || "", false),
          dueDate: toApiDateTime(values.endDate || "", false),
          description: values.goal,
          allDay: false,
          autoCompleteSprint: values.autoCompleteSprint,
        },
      });
      deps.setEditingGroup(null);
      toast.success(message("project.sprint.updated"));
    } catch (error) {
      toast.error(getProjectErrorMessage(error, message, "project.sprint.updateFailed"));
    }
  };

  const deleteGroup = async (group: Task) => {
    const confirmed = await confirmProjectAction({
      title: message("project.group.deleteConfirmTitle", { name: group.title }),
      text: message("project.group.deleteConfirmText"),
      confirmText: message("project.group.delete"),
      cancelText: message("app.cancel"),
      icon: "warning",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      const children = deps.tasks.filter((task) => task.parentTaskId === group.id);
      await Promise.all(children.map((task) => deps.updateTask({
        taskId: task.id,
        payload: { clearParent: true },
      })));
      await deps.updateTask({
        taskId: group.id,
        payload: { archived: true, isParentTask: false },
      });
      deps.setSelectedTask(null);
      toast.success(message("project.group.deleted"));
    } catch (error) {
      toast.error(getProjectErrorMessage(error, message, "project.group.deleteFailed"));
    }
  };

  const reorderTasks = async (group: Task, orderedTasks: Task[]) => {
    try {
      await Promise.all(orderedTasks.map((task, index) => deps.updateTask({
        taskId: task.id,
        payload: { rank: String((index + 1) * 1000).padStart(20, "0") },
      })));
      toast.success(message("project.group.reordered", { name: group.title }));
    } catch (error) {
      toast.error(getProjectErrorMessage(error, message, "project.group.reorderFailed"));
    }
  };

  const createTaskInline = async (title: string, parentTaskId?: string, isParentTask = false) => {
    try {
      await deps.createTask({
        title: title.trim(),
        ...(parentTaskId ? { parentTaskId } : {}),
        ...(isParentTask ? { isParentTask: true } : {}),
      });
      toast.success(message("project.task.created"));
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(
        apiError.response?.data?.message ||
          getProjectErrorMessage(error, message, "project.task.createFailed"),
      );
    }
  };

  const createSprintTask = async (sprintId: string, title: string) => {
    try {
      await deps.createTask({ title, status: TaskStatus.TODO, sprintId });
      toast.success(message("project.sprint.taskCreated"));
    } catch (error) {
      toast.error(getProjectErrorMessage(error, message, "project.sprint.createTaskFailed"));
      throw error;
    }
  };

  return { editGroup, submitGroup, deleteGroup, reorderTasks, createTaskInline, createSprintTask };
}
