import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import type { Task, TaskLabel } from "../types/project";
import {
  useAttachLabel,
  useCreateLabel,
  useDeleteLabel,
  useDetachLabel,
  useUpdateLabel,
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

interface ProjectResourceActionsOptions {
  projectId: string;
  labels: TaskLabel[];
  selectedTask: Task | null;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  rejectChange: (taskId: string) => boolean;
  rejectChecklistChange: (taskId: string) => boolean;
}

export function useProjectResourceActions({
  projectId,
  labels,
  selectedTask,
  setSelectedTask,
  rejectChange,
  rejectChecklistChange,
}: ProjectResourceActionsOptions) {
  const createLabelMutation = useCreateLabel(projectId);
  const deleteLabelMutation = useDeleteLabel(projectId);
  const updateLabelMutation = useUpdateLabel(projectId);
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
    toast.success("Dependency created");
  };

  const deleteDependency = async (successorTaskId: string, predecessorTaskId: string) => {
    if (rejectChange(successorTaskId)) return;
    await deleteDependencyMutation.mutateAsync({ successorTaskId, predecessorTaskId });
    toast.success("Dependency removed");
  };

  const createLabel = async (payload: { name: string; color: string }) => {
    try {
      await createLabelMutation.mutateAsync(payload);
      toast.success("Label created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create label");
      throw error;
    }
  };

  const deleteLabel = async (labelId: string) => {
    try {
      await deleteLabelMutation.mutateAsync(labelId);
      setSelectedTask((current) =>
        current
          ? {
              ...current,
              labels: current.labels.filter((label) => label.id !== labelId),
            }
          : current,
      );
      toast.success("Label deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete label");
    }
  };

  const updateLabel = async (
    labelId: string,
    payload: { name: string; color: string },
  ) => {
    try {
      const updatedLabel = await updateLabelMutation.mutateAsync({
        labelId,
        payload,
      });
      setSelectedTask((current) =>
        current
          ? {
              ...current,
              labels: current.labels.map((label) =>
                label.id === updatedLabel.id ? updatedLabel : label,
              ),
            }
          : current,
      );
      toast.success("Label updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update label");
      throw error;
    }
  };

  const createChecklist = async (taskId: string, title: string) => {
    if (rejectChecklistChange(taskId)) throw new Error("Task is completed and read-only");
    const item = await createChecklistMutation.mutateAsync({ taskId, title });
    setSelectedTask((current) => current?.id === taskId
      ? { ...current, checklists: [...current.checklists, item] }
      : current);
    return item;
  };

  const updateChecklist = async (checklistId: string, completed: boolean) => {
    if (selectedTask && rejectChecklistChange(selectedTask.id)) {
      throw new Error("Task is completed and read-only");
    }
    const item = await updateChecklistMutation.mutateAsync({ checklistId, completed });
    setSelectedTask((current) => current ? {
      ...current,
      checklists: current.checklists.map((checklist) => checklist.id === checklistId ? item : checklist),
    } : current);
    return item;
  };

  const deleteChecklist = async (checklistId: string) => {
    if (selectedTask && rejectChecklistChange(selectedTask.id)) {
      throw new Error("Task is completed and read-only");
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
    updateLabel,
    createChecklist,
    updateChecklist,
    deleteChecklist,
  };
}
