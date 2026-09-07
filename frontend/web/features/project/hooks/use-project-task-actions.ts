import type { Dispatch, SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UpdateTaskPayload } from "../api/task.api";
import type { TaskFormValues } from "../components/task-form-dialog";
import { confirmProjectAction } from "../project-alert";
import type { ProjectPermissions } from "../project-permissions";
import { canMoveTaskForward, TASK_STATUS_LABELS } from "../task-status-transition";
import type { TaskDrawerUpdatePayload } from "../types/task-detail-drawer.types";
import {
  isTerminalTaskStatus,
  TaskStatus,
  type ProjectMember,
  type Task,
  type TaskAssignee,
} from "../types/project";
import { taskKeys } from "./use-tasks";

const BACKEND_TASK_FIELDS = new Set([
  "title",
  "description",
  "status",
  "priority",
  "startDate",
  "dueDate",
  "allDay",
  "estimatedMinutes",
  "assigneeUserId",
]);

interface ProjectTaskActionOptions {
  projectId: string;
  tasks: Task[];
  members: ProjectMember[];
  permissions: ProjectPermissions;
  editingTask: Task | null;
  targetSprintId?: string;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  setStatusOverrides: Dispatch<SetStateAction<Record<string, TaskStatus>>>;
  rejectChange: (taskId: string) => boolean;
  closeTaskForm: () => void;
  createTask: (payload: TaskFormValues) => Promise<Task>;
  updateTask: (input: { taskId: string; payload: UpdateTaskPayload }) => Promise<unknown>;
  addTasksToSprint: (input: { sprintId: string; taskIds: string[] }) => Promise<unknown>;
}

function resolveAssignees(
  current: TaskAssignee[],
  payload: TaskDrawerUpdatePayload,
  members: ProjectMember[],
  taskId: string,
): TaskAssignee[] {
  if (payload.assignees) return payload.assignees;
  if (!("assigneeUserId" in payload)) return current;
  const userId = payload.assigneeUserId;
  if (!userId) return [];
  const member = members.find((item) => item.userId === userId);
  if (!member) return [];
  return [{
    id: `ta-${Date.now()}`,
    taskId,
    userId: member.userId,
    displayName: member.displayName,
    avatarUrl: member.avatarUrl,
    assignedAt: new Date().toISOString(),
  }];
}

export function useProjectTaskActions(options: ProjectTaskActionOptions) {
  const queryClient = useQueryClient();

  const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    const task = options.tasks.find((item) => item.id === taskId);
    if (!task || task.status === newStatus) return;
    if (isTerminalTaskStatus(task.status) || !options.permissions.canEditTask(task)) return;
    if (!canMoveTaskForward(task, newStatus)) return;
    const confirmed = await confirmProjectAction({
      title: "Chuyển trạng thái công việc?",
      text: `Chuyển “${task.title}” từ ${TASK_STATUS_LABELS[task.status]} sang ${TASK_STATUS_LABELS[newStatus]}?`,
      confirmText: "Chuyển trạng thái",
      icon: "question",
    });
    if (!confirmed) return;

    options.setStatusOverrides((current) => ({ ...current, [taskId]: newStatus }));
    try {
      await options.updateTask({ taskId, payload: { status: newStatus } });
      options.setStatusOverrides((current) => {
        const next = { ...current };
        delete next[taskId];
        return next;
      });
    } catch {
      options.setStatusOverrides((current) => ({ ...current, [taskId]: task.status }));
      toast.error("Không thể cập nhật trạng thái task");
    }
  };

  const submitTask = async (values: TaskFormValues) => {
    if (options.editingTask && options.rejectChange(options.editingTask.id)) return;
    try {
      if (options.editingTask) {
        const payload = options.editingTask.parentTaskId && !values.parentTaskId
          ? { ...values, clearParent: true }
          : values;
        await options.updateTask({ taskId: options.editingTask.id, payload });
        toast.success("Cập nhật task thành công");
      } else {
        const task = await options.createTask(values);
        if (options.targetSprintId) {
          await options.addTasksToSprint({
            sprintId: options.targetSprintId,
            taskIds: [task.id],
          });
        }
        toast.success("Tạo task thành công");
      }
      options.closeTaskForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu task");
    }
  };

  const updateTaskDirect = async (taskId: string, payload: TaskDrawerUpdatePayload) => {
    if (options.rejectChange(taskId)) return;
    try {
      const backendPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => BACKEND_TASK_FIELDS.has(key)),
      ) as UpdateTaskPayload;
      if (Object.keys(backendPayload).length) {
        await options.updateTask({ taskId, payload: backendPayload });
      }

      queryClient.setQueryData<Task[]>(taskKeys.project(options.projectId), (current) =>
        current?.map((task) => task.id === taskId ? ({
          ...task,
          ...payload,
          assignees: resolveAssignees(task.assignees, payload, options.members, taskId),
        } as Task) : task),
      );
      options.setSelectedTask((current) => current?.id === taskId ? {
        ...current,
        ...payload,
        assignees: resolveAssignees(current.assignees, payload, options.members, taskId),
      } as Task : current);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || "Không thể cập nhật công việc");
    }
  };

  return { moveTask, submitTask, updateTaskDirect };
}
