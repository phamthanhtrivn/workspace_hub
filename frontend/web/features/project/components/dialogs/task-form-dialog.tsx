"use client";

import { useState } from "react";
import { AlignLeft, Clock3 } from "lucide-react";
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
    <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
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
      <DialogContent className="flex max-w-3xl flex-col p-0 gap-0 overflow-hidden rounded-dialog border-border bg-card sm:rounded-dialog">
        <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-0 max-h-[inherit] flex-col">
          <DialogHeader className="shrink-0 px-4 pt-5 pb-4 pr-12 text-left border-b border-border sm:px-7">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {projectName ? `Project: ${projectName}` : "Project"}
            </p>
            <DialogTitle className="mt-1 text-section-title font-semibold tracking-tight text-foreground">
              Create New Task
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-muted-foreground">
              Fill in the details below to create a new task in this project.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-7">
            <section>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-foreground">
                  Task Title <span className="text-destructive-content">*</span>
                </span>
                <Input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What needs to be done?"
                  maxLength={200}
                  required
                  className="h-11 w-full rounded-control border-input px-4 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="mt-1 block text-xs text-muted-foreground">
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
                  className="w-full resize-y rounded-control border-input px-4 py-3 text-xs leading-6 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
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

          </div>

          <DialogFooter className="flex shrink-0 flex-wrap items-center justify-between border-t border-border bg-background px-4 py-4 sm:px-7">
            <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Clock3 className="h-3.5 w-3.5" />
              You can always edit this task later from the detail drawer.
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-control font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="cursor-pointer rounded-control bg-primary font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
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
