"use client";

import { useEffect, useState } from "react";
import {
  AlignLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  Flag,
  Timer,
  X,
} from "lucide-react";
import { TaskPriority, TaskStatus, type Task } from "@/types/project";

const STATUS_OPTIONS = [
  { value: TaskStatus.TODO, label: "To Do" },
  { value: TaskStatus.IN_PROGRESS, label: "In Progress" },
  { value: TaskStatus.IN_REVIEW, label: "In Review" },
  { value: TaskStatus.DONE, label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: TaskPriority.LOW, label: "Thấp" },
  { value: TaskPriority.MEDIUM, label: "Trung bình" },
  { value: TaskPriority.HIGH, label: "Cao" },
  { value: TaskPriority.URGENT, label: "Khẩn cấp" },
];

function toDateInput(value?: string): string {
  return value?.slice(0, 10) || "";
}

function toDateTimeInput(value?: string): string {
  if (!value) return "";
  return value.length === 10 ? `${value}T09:00` : value.slice(0, 16);
}

function toApiDateTime(value: string, allDay: boolean): string | undefined {
  if (!value) return undefined;
  return allDay && value.length === 10 ? `${value}T00:00:00` : value;
}

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  dueDate?: string;
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
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority || TaskPriority.MEDIUM,
  );
  const [status, setStatus] = useState<TaskStatus>(
    task?.status || initialStatus,
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
              {projectName ? `Project / ${projectName}` : "Project"}
            </p>
            <h2 className="mt-1 text-xl font-black text-[var(--color-primary-dark)]">
              {task ? "Chỉnh sửa task" : "Tạo task"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {task
                ? "Cập nhật thông tin và tiến độ công việc."
                : "Tạo một công việc mới trong project này."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-7">
          <section>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                Summary / Tên task <span className="text-red-500">*</span>
              </span>
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nhập tên task ngắn gọn, dễ hiểu"
                maxLength={200}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Ví dụ: Thiết kế giao diện trang chủ
              </span>
            </label>
          </section>

          <section>
            <label className="block">
              <FieldLabel icon={AlignLeft}>Mô tả</FieldLabel>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Mô tả mục tiêu, phạm vi hoặc tiêu chí hoàn thành của task..."
                rows={5}
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
              />
            </label>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm font-black text-[var(--color-primary-dark)]">
                Details
              </span>
              <span className="text-xs text-slate-400">Thông tin quản lý task</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel icon={ChevronDown}>Trạng thái</FieldLabel>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as TaskStatus)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>

              <label className="block">
                <FieldLabel icon={Flag}>Độ ưu tiên</FieldLabel>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as TaskPriority)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
                  >
                    {PRIORITY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>

              <label className="block">
                <FieldLabel icon={ChevronDown}>Task cha</FieldLabel>
                <div className="relative">
                  <select
                    value={parentTaskId}
                    onChange={(event) => setParentTaskId(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
                  >
                    <option value="">Không có — task lớn</option>
                    {parentTasks
                      .filter((candidate) => candidate.id !== task?.id && !candidate.parentTaskId)
                      .map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.title}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <span className="mt-1 block text-[11px] text-slate-400">
                  Chọn task lớn nếu đây là một task nhỏ/subtask.
                </span>
              </label>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[var(--color-primary-dark)]">Lịch trình</p>
                <p className="mt-0.5 text-xs text-slate-400">Thiết lập thời gian thực hiện</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(event) => handleAllDayChange(event.target.checked)}
                  className="h-4 w-4 accent-[var(--color-secondary)]"
                />
                Cả ngày
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel icon={CalendarDays}>{allDay ? "Ngày bắt đầu" : "Bắt đầu lúc"}</FieldLabel>
                <input
                  type={allDay ? "date" : "datetime-local"}
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
                />
              </label>
              <label className="block">
                <FieldLabel icon={CalendarDays}>{allDay ? "Ngày kết thúc" : "Hạn hoàn thành"}</FieldLabel>
                <input
                  type={allDay ? "date" : "datetime-local"}
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
                />
              </label>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <label className="block max-w-sm">
              <FieldLabel icon={Timer}>Ước tính thời lượng</FieldLabel>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={estimatedMinutes}
                  onChange={(event) => setEstimatedMinutes(event.target.value)}
                  placeholder="Ví dụ: 120"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 pr-20 text-sm text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  phút
                </span>
              </div>
              <span className="mt-1 block text-[11px] text-slate-400">
                Có thể bỏ trống nếu chưa xác định.
              </span>
            </label>
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7">
          <p className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
            <Clock3 className="h-3.5 w-3.5" />
            Có thể chỉnh sửa sau khi tạo
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="rounded-xl bg-[var(--color-primary-dark)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Đang lưu..." : task ? "Lưu thay đổi" : "Tạo task"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
