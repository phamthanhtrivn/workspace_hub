"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type ProjectMember,
  type Task,
  type TaskLabel,
  TaskPriority,
  TaskStatus,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import { useTaskActivities } from "@/features/project/hooks/use-tasks";
import type { TaskDrawerUpdatePayload } from "@/features/project/types/task-detail-drawer.types";
import { createTaskActivityPresenter } from "@/features/project/task-activity-presenter";
import { toApiDateTime } from "@/features/project/utils/task-dates";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export type TaskDetailTab = "details" | "activity";

export interface UseTaskDetailDrawerStateParams {
  task: Task | null;
  tasks?: Task[];
  members?: ProjectMember[];
  onClose: () => void;
  onUpdateTask?: (taskId: string, payload: TaskDrawerUpdatePayload) => Promise<void>;
  onToggleLabel?: (taskId: string, labelId: string, attached: boolean) => Promise<void>;
  onCreateDependency?: (successorTaskId: string, predecessorTaskId: string) => Promise<void>;
  onDeleteDependency?: (successorTaskId: string, predecessorTaskId: string) => Promise<void>;
  canEditTask?: boolean;
}

export function useTaskDetailDrawerState({
  task,
  tasks = [],
  members = [],
  onClose,
  onUpdateTask,
  onToggleLabel,
  onCreateDependency,
  onDeleteDependency,
  canEditTask = false,
}: UseTaskDetailDrawerStateParams) {
  const intl = useAppIntl();
  const [activeTab, setActiveTab] = useState<TaskDetailTab>("details");

  // Inline edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState("");

  const {
    data: activities = [],
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
    refetch: refetchActivities,
  } = useTaskActivities(task?.id || "");

  const isReadOnly = task
    ? isTerminalTaskStatus(task.status) || !canEditTask
    : true;

  // Reset temp inputs when task changes
  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Draft fields must reset when the selected task changes.
      setTempTitle(task.title);
      setTempDesc(task.description || "");
      setIsEditingTitle(false);
      setIsEditingDesc(false);
      setActiveTab("details");
    }
  }, [task]);

  useEffect(() => {
    if (!task) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, task]);

  const { memberDisplayName } = createTaskActivityPresenter(
    members,
    tasks,
    (id, values) => intl.formatMessage({ id }, values),
    (value) => intl.formatDate(value),
  );

  const handleTitleSave = async () => {
    if (!task || isReadOnly) return;
    if (!tempTitle.trim() || tempTitle === task.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { title: tempTitle.trim() });
        toast.success(intl.formatMessage({ id: "project.task.titleUpdated" }));
      }
      setIsEditingTitle(false);
    } catch {
      setTempTitle(task.title);
    }
  };

  const handleDescSave = async () => {
    if (!task || isReadOnly) return;
    if (tempDesc === task.description) {
      setIsEditingDesc(false);
      return;
    }
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { description: tempDesc });
        toast.success(intl.formatMessage({ id: "project.task.descriptionUpdated" }));
      }
      setIsEditingDesc(false);
    } catch {
      setTempDesc(task.description || "");
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || isReadOnly || newStatus === task.status) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { status: newStatus });
        toast.success(intl.formatMessage({ id: "project.task.statusUpdated" }));
      }
    } catch {}
  };

  const handleAssigneeChange = async (userId: string | null) => {
    if (!task || isReadOnly) return;
    try {
      if (onUpdateTask) {
        if (userId) {
          await onUpdateTask(task.id, { assigneeUserId: userId });
        } else {
          await onUpdateTask(task.id, { assigneeUserId: null, assignees: [] });
        }
        toast.success(
          intl.formatMessage({
            id: userId
              ? "project.task.assigneeUpdated"
              : "project.task.unassignedSuccess",
          }),
        );
      }
    } catch {}
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    if (!task || isReadOnly || priority === task.priority) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { priority });
        toast.success(intl.formatMessage({ id: "project.task.priorityUpdated" }));
      }
    } catch {}
  };

  const handleToggleLabel = async (label: TaskLabel) => {
    if (!task || isReadOnly || !onToggleLabel) return;
    const attached = task.labels.some((item) => item.id === label.id);
    try {
      await onToggleLabel(task.id, label.id, attached);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : intl.formatMessage({ id: "project.label.updateFailed" }),
      );
    }
  };

  const handleAddDependency = async (predecessorTaskId: string) => {
    if (!task || isReadOnly || !onCreateDependency) return;
    try {
      await onCreateDependency(task.id, predecessorTaskId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : intl.formatMessage({ id: "project.dependency.createFailed" }),
      );
    }
  };

  const handleDeleteDependency = async (predecessorTaskId: string) => {
    if (!task || isReadOnly || !onDeleteDependency) return;
    try {
      await onDeleteDependency(task.id, predecessorTaskId);
      toast.success(intl.formatMessage({ id: "project.dependency.deleted" }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : intl.formatMessage({ id: "project.dependency.deleteFailed" }),
      );
    }
  };

  const handleDueDateChange = async (val: string) => {
    if (!task || isReadOnly) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, {
          dueDate: toApiDateTime(val ? `${val}T18:00:00` : "", task.allDay),
        });
        toast.success(intl.formatMessage({ id: "project.task.dueDateUpdated" }));
      }
    } catch {}
  };

  const handleStartDateChange = async (val: string) => {
    if (!task || isReadOnly) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, {
          startDate: toApiDateTime(val ? `${val}T09:00:00` : "", task.allDay),
        });
        toast.success(intl.formatMessage({ id: "project.task.startDateUpdated" }));
      }
    } catch {}
  };

  const handleEstimateSave = async (minutes: number) => {
    if (!task || isReadOnly) return;
    if (onUpdateTask) {
      await onUpdateTask(task.id, { estimatedMinutes: minutes });
      toast.success(intl.formatMessage({ id: "project.task.estimateUpdated" }));
    }
  };

  const handleTabChange = (tab: TaskDetailTab) => {
    setActiveTab(tab);
    if (tab === "activity") void refetchActivities();
  };

  return {
    activeTab,
    handleTabChange,
    isEditingTitle,
    setIsEditingTitle,
    tempTitle,
    setTempTitle,
    handleTitleSave,
    isEditingDesc,
    setIsEditingDesc,
    tempDesc,
    setTempDesc,
    handleDescSave,
    isReadOnly,
    memberDisplayName,
    activities,
    isActivitiesLoading,
    isActivitiesError,
    refetchActivities,
    handleStatusChange,
    handleAssigneeChange,
    handlePriorityChange,
    handleToggleLabel,
    handleAddDependency,
    handleDeleteDependency,
    handleDueDateChange,
    handleStartDateChange,
    handleEstimateSave,
  };
}
