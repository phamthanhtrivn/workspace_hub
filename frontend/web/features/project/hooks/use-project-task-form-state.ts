import { useState } from "react";
import { TaskStatus, type Task } from "../types/project";

export function useProjectTaskFormState(isSoftwareProject: boolean) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [startDate, setStartDate] = useState<string>();
  const [allDay, setAllDay] = useState(false);
  const [parentTaskId, setParentTaskId] = useState<string>();
  const [sprintId, setSprintId] = useState<string>();
  const [isParentTask, setIsParentTask] = useState(false);

  const open = (
    nextStatus: TaskStatus = TaskStatus.TODO,
    nextStartDate?: string,
    nextAllDay = false,
    nextParentTaskId?: string,
    nextSprintId?: string,
  ) => {
    setEditingTask(null);
    setStatus(nextStatus);
    setStartDate(nextStartDate);
    setAllDay(nextAllDay);
    setParentTaskId(nextParentTaskId);
    setSprintId(nextSprintId);
    setIsParentTask(!isSoftwareProject && !nextParentTaskId);
    setIsOpen(true);
  };

  const edit = (task: Task) => {
    setEditingTask(task);
    setStatus(task.status);
    setStartDate(undefined);
    setAllDay(false);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setEditingTask(null);
    setStatus(TaskStatus.TODO);
    setStartDate(undefined);
    setAllDay(false);
    setParentTaskId(undefined);
    setSprintId(undefined);
    setIsParentTask(false);
  };

  return {
    isOpen,
    setIsOpen,
    editingTask,
    setEditingTask,
    status,
    startDate,
    allDay,
    parentTaskId,
    sprintId,
    isParentTask,
    open,
    edit,
    close,
  };
}
