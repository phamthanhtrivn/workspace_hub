"use client";

import { useEffect, useState } from "react";
import { AlignLeft, Clock3, FileText, Paperclip, Timer, Trash2, Upload, X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
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

const toDateInput = (value?: string) => taskDateKey(value, true);

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

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
  task,
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
  task: Task | null;
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
  const intl = useAppIntl();
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority || TaskPriority.MEDIUM,
  );
  const status = task?.status || initialStatus;
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleClose = () => {
    if (isSubmitting) return;
    setPendingFiles([]);
    onClose();
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setPendingFiles([]);
        onClose();
      }
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
      startDate: toApiDateTime(startDate, allDay),
      dueDate: toApiDateTime(dueDate, allDay),
      allDay,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      parentTaskId: parentTaskId || undefined,
    });
    setPendingFiles([]);
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
        onClick={handleClose}
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
            onClick={handleClose}
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
            priority={priority}
            onPriorityChange={setPriority}
            parentTaskId={parentTaskId}
            onParentTaskIdChange={setParentTaskId}
            parentTasks={parentTasks}
            currentTaskId={task?.id}
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
            <div className="mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-black text-[var(--color-primary-dark)]">
                {intl.formatMessage({ id: "project.task.attachments" })}
              </span>
              <span className="text-xs text-slate-400">
                {intl.formatMessage({ id: "project.task.attachmentsUiOnly" })}
              </span>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-600 transition hover:border-[var(--color-secondary)] hover:bg-blue-50 hover:text-[var(--color-secondary)]">
              <Upload className="h-4 w-4" />
              {intl.formatMessage({ id: "project.task.chooseFiles" })}
              <input
                type="file"
                multiple
                className="hidden"
                disabled={isSubmitting}
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files ?? []);
                  setPendingFiles((current) => [...current, ...selectedFiles]);
                  event.target.value = "";
                }}
              />
            </label>

            {pendingFiles.length > 0 && (
              <ul className="mt-3 space-y-2">
                {pendingFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingFiles((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index),
                        )
                      }
                      aria-label={intl.formatMessage(
                        { id: "project.file.delete" },
                        { name: file.name },
                      )}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-t border-slate-100 pt-5">
            <label className="block max-w-sm">
              <FieldLabel icon={Timer}>
                {intl.formatMessage({ id: "project.task.estimate" })}
              </FieldLabel>
              <TaskDurationSelect
                value={estimatedMinutes}
                onValueChange={setEstimatedMinutes}
                disabled={isSubmitting}
              />
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
              onClick={handleClose}
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
