import { useState } from "react";
import { TaskStatus } from "../types/project";

export function useProjectTaskFormState() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [startDate, setStartDate] = useState<string>();
  const [allDay, setAllDay] = useState(false);
  const [parentTaskId, setParentTaskId] = useState<string>();

  const open = (
    nextStatus: TaskStatus = TaskStatus.TODO,
    nextStartDate?: string,
    nextAllDay = false,
    nextParentTaskId?: string,
  ) => {
    setStatus(nextStatus);
    setStartDate(nextStartDate);
    setAllDay(nextAllDay);
    setParentTaskId(nextParentTaskId);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setStatus(TaskStatus.TODO);
    setStartDate(undefined);
    setAllDay(false);
    setParentTaskId(undefined);
  };

  return {
    isOpen,
    setIsOpen,
    status,
    startDate,
    allDay,
    parentTaskId,
    open,
    close,
  };
}
