import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import type { CreateTaskPayload, UpdateTaskPayload } from "./api/task.api";
import type { SprintFormValues } from "./components/sprint-edit-dialog";
import { confirmProjectAction } from "./project-alert";
import { TaskStatus, type Task } from "./types/project";
import { toApiDateTime } from "./utils/task-dates";

interface ProjectGroupActionDependencies {
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
      toast.success("Cập nhật sprint thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật sprint");
    }
  };

  const deleteGroup = async (group: Task) => {
    const confirmed = await confirmProjectAction({
      title: `Xóa nhóm “${group.title}”?`,
      text: "Các công việc bên trong sẽ được chuyển về Backlog.",
      confirmText: "Xóa nhóm",
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
      toast.success("Đã xóa sprint và chuyển task về Backlog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa sprint");
    }
  };

  const reorderTasks = async (group: Task, orderedTasks: Task[]) => {
    try {
      await Promise.all(orderedTasks.map((task, index) => deps.updateTask({
        taskId: task.id,
        payload: { rank: String((index + 1) * 1000).padStart(20, "0") },
      })));
      toast.success(`Đã sắp xếp lại work items trong "${group.title}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể sắp xếp work items");
    }
  };

  const createTaskInline = async (title: string, parentTaskId?: string, isParentTask = false) => {
    try {
      await deps.createTask({
        title: title.trim(),
        ...(parentTaskId ? { parentTaskId } : {}),
        ...(isParentTask ? { isParentTask: true } : {}),
      });
      toast.success("Tạo công việc thành công");
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || (error instanceof Error ? error.message : "Không thể tạo công việc"));
    }
  };

  const createSprintTask = async (sprintId: string, title: string) => {
    try {
      await deps.createTask({ title, status: TaskStatus.TODO, sprintId });
      toast.success("Tạo task trong Sprint thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo task trong Sprint");
      throw error;
    }
  };

  return { editGroup, submitGroup, deleteGroup, reorderTasks, createTaskInline, createSprintTask };
}
