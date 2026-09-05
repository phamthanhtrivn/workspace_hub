"use client";

import { useEffect, useState } from "react";
import { AlignLeft, Clock3, Timer, X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  taskDateKey,
  toDateTimeInput,
  toApiDateTime,
} from "../utils/task-dates";
import {
  TaskPriority,
  TaskStatus,
  TaskType,
  type Task,
} from "@/features/project/types/project";
import { TaskDetailsFields } from "./task-details-fields";
import { TaskDateRangeFields } from "./task-date-range-fields";

const toDateInput = (value?: string) => taskDateKey(value, true);

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  taskType: TaskType;
  startDate?: string | null;
  dueDate?: string | null;
  allDay: boolean;
  estimatedMinutes: number;
  parentTaskId?: string;
  isParentTask?: boolean;
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
  task,
  projectName,
  parentTasks = [],
  initialParentTaskId,
  initialIsParentTask = false,
  initialStatus = TaskStatus.TODO,
  initialStartDate,
  initialAllDay = false,
  onClose,
  onSubmit,
  isSubmitting = false,
}: {
  open: boolean;
  task: Task | null;
  projectName?: string;
  parentTasks?: Task[];
  initialParentTaskId?: string;
  initialIsParentTask?: boolean;
  initialStatus?: TaskStatus;
  initialStartDate?: string;
  initialAllDay?: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const intl = useAppIntl();
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority || TaskPriority.MEDIUM,
  );
  const [status, setStatus] = useState<TaskStatus>(
    task?.status || initialStatus,
  );
  const [taskType, setTaskType] = useState<TaskType>(
    task?.taskType ||
      (initialParentTaskId
        ? TaskType.SUBTASK
        : initialIsParentTask
          ? TaskType.EPIC
          : TaskType.TASK),
  );
  const [startDate, setStartDate] = useState(
    task?.allDay || initialAllDay
      ? toDateInput(task?.startDate || initialStartDate)
      : toDateTimeInput(task?.startDate || initialStartDate),
  );
  const [dueDate, setDueDate] = useState(
    task?.allDay ? toDateInput(task?.dueDate) : toDateTimeInput(task?.dueDate),
  );
  const [allDay, setAllDay] = useState(task?.allDay || initialAllDay);
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task?.estimatedMinutes ? String(task.estimatedMinutes) : "",
  );
  const [parentTaskId, setParentTaskId] = useState(
    task?.parentTaskId || initialParentTaskId || "",
  );
  const [isParentTask] = useState(task?.isParentTask ?? initialIsParentTask);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose, open]);

  if (!open) return null;

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!title.trim() || isSubmitting) return;

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      taskType,
      startDate: toApiDateTime(startDate, allDay),
      dueDate: toApiDateTime(dueDate, allDay),
      allDay,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      parentTaskId: parentTaskId || undefined,
      isParentTask: isParentTask && !parentTaskId,
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={() => !isSubmitting && onClose()}
      />

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]"
      >
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-7">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {projectName
                ? intl.formatMessage(
                    { id: "project.breadcrumb" },
                    { name: projectName },
                  )
                : intl.formatMessage({ id: "project.project" })}
            </p>
            <h2 className="mt-1 text-xl font-black text-[var(--color-primary-dark)]">
              {intl.formatMessage({
                id: task
                  ? "project.task.editTitle"
                  : "project.task.createTitle",
              })}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {intl.formatMessage({
                id: task
                  ? "project.task.editDescription"
                  : "project.task.createDescription",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={intl.formatMessage({ id: "app.close" })}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-7">
          <section>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                {intl.formatMessage({ id: "project.task.summary" })}{" "}
                <span className="text-red-500">*</span>
              </span>
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={intl.formatMessage({
                  id: "project.task.titlePlaceholder",
                })}
                maxLength={200}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                {intl.formatMessage({ id: "project.task.titleHint" })}
              </span>
            </label>
          </section>

          <section>
            <label className="block">
              <FieldLabel icon={AlignLeft}>
                {intl.formatMessage({ id: "project.task.description" })}
              </FieldLabel>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={intl.formatMessage({
                  id: "project.task.descriptionPlaceholder",
                })}
                rows={5}
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
              />
            </label>
          </section>

          <TaskDetailsFields
            taskType={taskType}
            onTaskTypeChange={setTaskType}
            status={status}
            onStatusChange={setStatus}
            priority={priority}
            onPriorityChange={setPriority}
            parentTaskId={parentTaskId}
            onParentTaskIdChange={setParentTaskId}
            parentTasks={parentTasks}
            currentTaskId={task?.id}
            isParentTask={isParentTask}
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
              <FieldLabel icon={Timer}>
                {intl.formatMessage({ id: "project.task.estimate" })}
              </FieldLabel>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={estimatedMinutes}
                  onChange={(event) => setEstimatedMinutes(event.target.value)}
                  placeholder={intl.formatMessage({
                    id: "project.task.estimatePlaceholder",
                  })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 pr-20 text-sm text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  {intl.formatMessage({ id: "project.task.minutes" })}
                </span>
              </div>
              <span className="mt-1 block text-[11px] text-slate-400">
                {intl.formatMessage({ id: "project.task.estimateHint" })}
              </span>
            </label>
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7">
          <p className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
            <Clock3 className="h-3.5 w-3.5" />
            {intl.formatMessage({ id: "project.task.editLaterHint" })}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:opacity-50"
            >
              {intl.formatMessage({ id: "app.cancel" })}
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="rounded-xl bg-[var(--color-primary-dark)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? intl.formatMessage({ id: "app.saving" })
                : intl.formatMessage({
                    id: task
                      ? "project.task.saveChanges"
                      : "project.task.create",
                  })}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
