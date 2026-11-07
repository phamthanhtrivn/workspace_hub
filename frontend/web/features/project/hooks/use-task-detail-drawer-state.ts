"use client";

import { getActionErrorMessage } from "@/lib/permission-feedback";
import { useRef, useState } from "react";
import { getDateRangeErrors, hasDateRangeErrors, type DateRangeErrors } from "@/lib/date-range";
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
import {
  taskDateKey,
  toApiDateTime,
  toDateTimeInput,
} from "@/features/project/utils/task-dates";

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
  canContributeTask?: boolean;
}

export function useTaskDetailDrawerState({
  task,
  tasks = [],
  members = [],
  onUpdateTask,
  onToggleLabel,
  onCreateDependency,
  onDeleteDependency,
  canEditTask = false,
  canContributeTask = false,
}: UseTaskDetailDrawerStateParams) {
  const [activeTab, setActiveTab] = useState<TaskDetailTab>("details");

  const schedulePending = useRef(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<{ taskId: string; errors: DateRangeErrors } | null>(null);

  // Inline edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(task?.title ?? "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState(task?.description ?? "");

  const {
    data: activities = [],
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
    refetch: refetchActivities,
  } = useTaskActivities(task?.id || "");

  const isReadOnly = task
    ? isTerminalTaskStatus(task.status) || !canEditTask
    : true;
  const canChangeStatus = task
    ? !isTerminalTaskStatus(task.status) && (canEditTask || canContributeTask)
    : false;
  const openSubtasks = task
    ? tasks.filter(
        (candidate) =>
          candidate.parentTaskId === task.id &&
          !candidate.archived &&
          candidate.status !== TaskStatus.DONE,
      )
    : [];



  const { memberDisplayName } = createTaskActivityPresenter(members, tasks);

  const handleTitleSave = async () => {
    if (!task || isReadOnly) return;
    if (!tempTitle.trim() || tempTitle === task.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { title: tempTitle.trim() });
        toast.success("Task title updated");
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
        toast.success("Task description updated");
      }
      setIsEditingDesc(false);
    } catch {
      setTempDesc(task.description || "");
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || !canChangeStatus || newStatus === task.status) return;
    if (newStatus === TaskStatus.DONE && openSubtasks.length > 0) {
      toast.error("Complete all subtasks before marking this task as done.");
      return;
    }
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { status: newStatus });
        toast.success("Task status updated");
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
        toast.success(userId ? "Task assignee updated" : "Task unassigned");
      }
    } catch {}
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    if (!task || isReadOnly || priority === task.priority) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { priority });
        toast.success("Task priority updated");
      }
    } catch {}
  };

  const handleParentTaskChange = async (parentTaskId: string) => {
    if (!task || isReadOnly) return;
    const nextParentTaskId = parentTaskId || undefined;
    if (nextParentTaskId === task.parentTaskId) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(
          task.id,
          nextParentTaskId
            ? { parentTaskId: nextParentTaskId }
            : {
                parentTaskId: undefined,
                clearParent: Boolean(task.parentTaskId),
              },
        );
        toast.success("Parent task updated");
      }
    } catch {}
  };

  const saveSchedule = async (payload: TaskDrawerUpdatePayload, message: string) => {
    if (!task || isReadOnly || !onUpdateTask || schedulePending.current) return;
    const allDay = payload.allDay ?? task.allDay;
    const format = (value?: string | null) => allDay ? taskDateKey(value, true) : toDateTimeInput(value);
    const errors = getDateRangeErrors({
      start: format(payload.startDate === undefined ? task.startDate : payload.startDate),
      end: format(payload.dueDate === undefined ? task.dueDate : payload.dueDate),
      mode: "edit", dateOnly: allDay,
    });
    if (hasDateRangeErrors(errors)) {
      setScheduleError({ taskId: task.id, errors });
      toast.error(errors.start || errors.end);
      return;
    }
    schedulePending.current = true;
    setIsSavingSchedule(true);
    setScheduleError(null);
    try {
      await onUpdateTask(task.id, payload);
      toast.success(message);
    } catch (error) {
      toast.error(getActionErrorMessage(error, "Could not update this task's schedule. Try again."));
    } finally {
      schedulePending.current = false;
      setIsSavingSchedule(false);
    }
  };

  const handleAllDayChange = async (allDay: boolean) => {
    if (!task || allDay === task.allDay) return;
    const convert = (value?: string | null) => value
      ? toApiDateTime(allDay ? taskDateKey(value, true) : toDateTimeInput(value), allDay) : null;
    await saveSchedule({ allDay, startDate: convert(task.startDate), dueDate: convert(task.dueDate) }, "Task schedule updated");
  };

  const handleToggleLabel = async (label: TaskLabel) => {
    if (!task || isReadOnly || !onToggleLabel) return;
    const attached = task.labels.some((item) => item.id === label.id);
    try {
      await onToggleLabel(task.id, label.id, attached);
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, error instanceof Error ? error.message : "Failed to update label"),
      );
    }
  };

  const handleAddDependency = async (predecessorTaskId: string) => {
    if (!task || isReadOnly || !onCreateDependency) return;
    try {
      await onCreateDependency(task.id, predecessorTaskId);
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, error instanceof Error ? error.message : "Failed to create dependency"),
      );
    }
  };

  const handleDeleteDependency = async (predecessorTaskId: string) => {
    if (!task || isReadOnly || !onDeleteDependency) return;
    try {
      await onDeleteDependency(task.id, predecessorTaskId);
      toast.success("Dependency removed");
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, error instanceof Error ? error.message : "Failed to delete dependency"),
      );
    }
  };

  const handleDueDateChange = async (value: string) => {
    if (!task) return;
    await saveSchedule({ dueDate: toApiDateTime(value, task.allDay) }, "Due date updated");
  };

  const handleStartDateChange = async (value: string) => {
    if (!task) return;
    await saveSchedule(value
      ? { startDate: toApiDateTime(value, task.allDay) }
      : { startDate: null, dueDate: null }, "Start date updated");
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
    canChangeStatus,
    memberDisplayName,
    activities,
    isActivitiesLoading,
    isActivitiesError,
    refetchActivities,
    handleStatusChange,
    openSubtasks,
    handleAssigneeChange,
    handlePriorityChange,
    handleParentTaskChange,
    handleAllDayChange,
    handleToggleLabel,
    handleAddDependency,
    handleDeleteDependency,
    isSavingSchedule,
    scheduleErrors: scheduleError?.taskId === task?.id ? scheduleError?.errors : undefined,
    handleDueDateChange,
    handleStartDateChange,
  };
}
