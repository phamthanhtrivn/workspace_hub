"use client";

import { useEffect, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import type { Task } from "@/types/project";

export interface SprintFormValues {
  name: string;
  startDate: string;
  endDate: string;
  autoCompleteSprint: boolean;
  goal: string;
}

function toDateTimeInput(value?: string): string {
  if (!value) return "";
  return value.length === 10 ? `${value}T09:00` : value.slice(0, 16);
}

export default function SprintEditDialog({
  open,
  sprint,
  onClose,
  onSubmit,
  isSubmitting = false,
}: {
  open: boolean;
  sprint: Task | null;
  onClose: () => void;
  onSubmit: (values: SprintFormValues) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoCompleteSprint, setAutoCompleteSprint] = useState(false);
  const [goal, setGoal] = useState("");

  useEffect(() => {
    if (!open || !sprint) return;
    setName(sprint.title);
    setStartDate(toDateTimeInput(sprint.startDate));
    setEndDate(toDateTimeInput(sprint.dueDate));
    setAutoCompleteSprint(Boolean(sprint.autoCompleteSprint));
    setGoal(sprint.description || "");
  }, [open, sprint]);

  if (!open || !sprint) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !startDate || !endDate || isSubmitting) return;

    await onSubmit({
      name: name.trim(),
      startDate,
      endDate,
      autoCompleteSprint,
      goal: goal.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-2 sm:p-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="relative w-full max-w-xl rounded-sm bg-white px-5 py-5 shadow-2xl sm:px-6 sm:py-6"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Đóng"
          className="absolute right-5 top-5 text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="pr-8 text-xl font-bold text-slate-800">
          Edit sprint: {sprint.title}
        </h2>
        <p className="mt-4 text-sm text-slate-700">
          Required fields are marked with an asterisk <span className="text-red-600">*</span>
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">
              Sprint name <span className="text-red-600">*</span>
            </span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={200}
              className="h-9 w-full rounded-sm border border-slate-500 px-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">
              Start date <span className="text-red-600">*</span>
            </span>
            <div className="relative">
              <input
                type="datetime-local"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                className="h-10 w-full rounded-sm border border-slate-500 px-2 pr-10 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <CalendarDays className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">
              End date <span className="text-red-600">*</span>
            </span>
            <div className="relative">
              <input
                type="datetime-local"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
                className="h-10 w-full rounded-sm border border-slate-500 px-2 pr-10 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <CalendarDays className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
            </div>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={autoCompleteSprint}
              onChange={(event) => setAutoCompleteSprint(event.target.checked)}
              className="h-4 w-4 accent-slate-800"
            />
            Automatically complete sprint
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">Sprint goal</span>
            <textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              rows={5}
              className="w-full resize-y rounded-sm border border-slate-500 px-2 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !startDate || !endDate}
            className="rounded-sm bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Updating..." : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
