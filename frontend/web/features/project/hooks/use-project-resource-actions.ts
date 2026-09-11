import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { confirmProjectAction } from "../project-alert";
import type { Task, TaskLabel } from "../types/project";
import {
  useAttachLabel,
  useCreateLabel,
  useDeleteLabel,
  useDetachLabel,
} from "./use-labels";
import {
  useCreateTaskDependency,
  useDeleteTaskDependency,
} from "./use-dependencies";
import {
  useCreateChecklist,
  useDeleteChecklist,
  useUpdateChecklist,
} from "./use-tasks";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface ProjectResourceActionsOptions {
  projectId: string;
  labels: TaskLabel[];
  selectedTask: Task | null;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  rejectChange: (taskId: string) => boolean;
}

export function useProjectResourceActions({
  projectId,
  labels,
  selectedTask,
  setSelectedTask,
  rejectChange,
}: ProjectResourceActionsOptions) {
  const intl = useAppIntl();
  const createLabelMutation = useCreateLabel(projectId);
  const deleteLabelMutation = useDeleteLabel(projectId);
  const attachLabelMutation = useAttachLabel(projectId);
  const detachLabelMutation = useDetachLabel(projectId);
  const createDependencyMutation = useCreateTaskDependency(projectId);
  const deleteDependencyMutation = useDeleteTaskDependency(projectId);
  const createChecklistMutation = useCreateChecklist(projectId);
  const updateChecklistMutation = useUpdateChecklist(projectId);
  const deleteChecklistMutation = useDeleteChecklist(projectId);

  const toggleLabel = async (taskId: string, labelId: string, attached: boolean) => {
    if (rejectChange(taskId)) return;
    const mutation = attached ? detachLabelMutation : attachLabelMutation;
    await mutation.mutateAsync({ taskId, labelId });
    const label = labels.find((item) => item.id === labelId);
    setSelectedTask((current) => {
      if (!current || current.id !== taskId || !label) return current;
      return {
        ...current,
        labels: attached
          ? current.labels.filter((item) => item.id !== labelId)
          : [...current.labels, label],
      };
    });
  };

  const createDependency = async (successorTaskId: string, predecessorTaskId: string) => {
    if (rejectChange(successorTaskId)) return;
    await createDependencyMutation.mutateAsync({ successorTaskId, predecessorTaskId });
    toast.success(intl.formatMessage({ id: "project.dependency.created" }));
  };

  const deleteDependency = async (successorTaskId: string, predecessorTaskId: string) => {
    if (rejectChange(successorTaskId)) return;
    await deleteDependencyMutation.mutateAsync({ successorTaskId, predecessorTaskId });
  };

  const createLabel = async (payload: { name: string; color: string }) => {
    try {
      await createLabelMutation.mutateAsync(payload);
      toast.success(intl.formatMessage({ id: "project.label.created" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : intl.formatMessage({ id: "project.label.createFailed" }));
    }
  };

  const deleteLabel = async (labelId: string) => {
    const confirmed = await confirmProjectAction({
      title: intl.formatMessage({ id: "project.label.deleteConfirmTitle" }),
      text: intl.formatMessage({ id: "project.label.deleteConfirmText" }),
      confirmText: intl.formatMessage({ id: "project.label.deleteAction" }),
      cancelText: intl.formatMessage({ id: "app.cancel" }),
      icon: "warning",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteLabelMutation.mutateAsync(labelId);
      toast.success(intl.formatMessage({ id: "project.label.deleted" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : intl.formatMessage({ id: "project.label.deleteFailed" }));
    }
  };

  const createChecklist = async (taskId: string, title: string) => {
    if (rejectChange(taskId)) throw new Error(intl.formatMessage({ id: "project.task.readOnly.completed" }));
    const item = await createChecklistMutation.mutateAsync({ taskId, title });
    setSelectedTask((current) => current?.id === taskId
      ? { ...current, checklists: [...current.checklists, item] }
      : current);
    return item;
  };

  const updateChecklist = async (checklistId: string, completed: boolean) => {
    if (selectedTask && rejectChange(selectedTask.id)) {
      throw new Error(intl.formatMessage({ id: "project.task.readOnly.completed" }));
    }
    const item = await updateChecklistMutation.mutateAsync({ checklistId, completed });
    setSelectedTask((current) => current ? {
      ...current,
      checklists: current.checklists.map((checklist) => checklist.id === checklistId ? item : checklist),
    } : current);
    return item;
  };

  const deleteChecklist = async (checklistId: string) => {
    if (selectedTask && rejectChange(selectedTask.id)) {
      throw new Error(intl.formatMessage({ id: "project.task.readOnly.completed" }));
    }
    await deleteChecklistMutation.mutateAsync(checklistId);
    setSelectedTask((current) => current ? {
      ...current,
      checklists: current.checklists.filter((checklist) => checklist.id !== checklistId),
    } : current);
  };

  return {
    toggleLabel,
    createDependency,
    deleteDependency,
    createLabel,
    deleteLabel,
    createChecklist,
    updateChecklist,
    deleteChecklist,
  };
}
