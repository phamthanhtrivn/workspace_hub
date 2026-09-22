"use client";

import { useState } from "react";
import { AlignLeft, Clock3, Timer } from "lucide-react";
import {
  taskDateKey,
  toDateTimeInput,
  toApiDateTime,
} from "@/features/project/utils/task-dates";
import {
  TaskPriority,
  TaskStatus,
  type Task,
} from "@/features/project/types/project";
import { TaskDetailsFields } from "../forms/task-details-fields";
import { TaskDateRangeFields } from "../forms/task-date-range-fields";
import { TaskDurationSelect } from "../forms/task-duration-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const toDateInput = (value?: string) => taskDateKey(value, true);

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  allDay: boolean;
  estimatedMinutes: number;
  parentTaskId?: string;
}

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: typeof AlignLeft;
  children: React.ReactNode;
}) {
  return (
    <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
      <Icon className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
      {children}
    </span>
  );
}

export default function TaskFormDialog({
  open,
  projectName,
  parentTasks = [],
  initialParentTaskId,
  initialStatus = TaskStatus.TODO,
  initialStartDate,
  initialAllDay = false,
  onClose,
  onSubmit,
  isSubmitting = false,
}: {
  open: boolean;
  projectName?: string;
  parentTasks?: Task[];
  initialParentTaskId?: string;
  initialStatus?: TaskStatus;
  initialStartDate?: string;
  initialAllDay?: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const status = initialStatus;
  const [startDate, setStartDate] = useState(
    initialAllDay
      ? toDateInput(initialStartDate)
      : toDateTimeInput(initialStartDate),
  );
  const [dueDate, setDueDate] = useState("");
  const [allDay, setAllDay] = useState(initialAllDay);
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [parentTaskId, setParentTaskId] = useState(initialParentTaskId || "");

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!title.trim() || isSubmitting) return;

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      startDate: toApiDateTime(startDate, allDay),
      dueDate: toApiDateTime(dueDate, allDay),
      allDay,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      parentTaskId: parentTaskId || undefined,
    });
  };

  const handleAllDayChange = (checked: boolean) => {
    setAllDay(checked);
    setStartDate((value) =>
      checked ? toDateInput(value) : toDateTimeInput(value),
    );
    setDueDate((value) =>
      checked ? toDateInput(value) : toDateTimeInput(value),
    );
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && handleClose()}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 text-left border-b border-slate-100 sm:px-7">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {projectName ? `Project: ${projectName}` : "Project"}
            </p>
            <DialogTitle className="mt-1 text-xl font-bold tracking-tight text-[#172B4D]">
              Create New Task
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-slate-500">
              Fill in the details below to create a new task in this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6 sm:px-7 max-h-[calc(100dvh-16rem)] overflow-y-auto">
            <section>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">
                  Task Title <span className="text-red-500">*</span>
                </span>
                <Input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What needs to be done?"
                  maxLength={200}
                  required
                  className="h-11 w-full rounded-xl border-slate-300 px-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  A clear, concise summary of the task.
                </span>
              </label>
            </section>

            <section>
              <label className="block">
                <FieldLabel icon={AlignLeft}>Description</FieldLabel>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add a detailed description, acceptance criteria, or context..."
                  rows={5}
                  className="w-full resize-y rounded-xl border-slate-200 px-4 py-3 text-xs leading-6 text-slate-700 placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15"
                />
              </label>
            </section>

            <TaskDetailsFields
              priority={priority}
              onPriorityChange={setPriority}
              parentTaskId={parentTaskId}
              onParentTaskIdChange={setParentTaskId}
              parentTasks={parentTasks}
            />

            <TaskDateRangeFields
              allDay={allDay}
              onAllDayChange={handleAllDayChange}
              startDate={startDate}
              onStartDateChange={setStartDate}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              disabled={isSubmitting}
            />

            <section className="border-t border-slate-100 pt-5">
              <label className="block max-w-sm">
                <FieldLabel icon={Timer}>Estimated Duration</FieldLabel>
                <TaskDurationSelect
                  value={estimatedMinutes}
                  onValueChange={setEstimatedMinutes}
                  disabled={isSubmitting}
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Approximate time needed to finish this task.
                </span>
              </label>
            </section>
          </div>

          <DialogFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7">
            <p className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
              <Clock3 className="h-3.5 w-3.5" />
              You can always edit this task later from the detail drawer.
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-xl font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="cursor-pointer rounded-xl bg-[#0052CC] font-bold text-white shadow-sm hover:bg-[#0747A6] disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Create Task"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
