import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Sprint } from "@/features/project/types/project";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface SprintFormModalProps {
  isOpen: boolean;
  editingSprint: Sprint | null;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
  isBusy?: boolean;
}

export function SprintFormModal({
  isOpen,
  editingSprint,
  onClose,
  onSubmit,
  isBusy = false,
}: SprintFormModalProps) {
  const intl = useAppIntl();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Form fields reset when modal opens or editing sprint changes.
      setName(editingSprint?.name || "");
      setGoal(editingSprint?.goal || "");
      setStartDate(editingSprint?.startDate?.slice(0, 10) || "");
      setEndDate(editingSprint?.endDate?.slice(0, 10) || "");
    }
  }, [isOpen, editingSprint]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !startDate || !endDate || isBusy) return;
    await onSubmit({
      name: name.trim(),
      goal: goal.trim(),
      startDate,
      endDate,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-[#172B4D]">
              {intl.formatMessage({
                id: editingSprint ? "project.sprint.edit" : "project.sprint.create",
              })}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {intl.formatMessage({ id: "project.sprint.createDescription" })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={intl.formatMessage({ id: "app.close" })}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={intl.formatMessage({ id: "project.sprint.name" })}
            required
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder={intl.formatMessage({ id: "project.sprint.goalOptional" })}
            rows={3}
            className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-500">
              {intl.formatMessage({ id: "project.startDate" })}
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700"
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              {intl.formatMessage({ id: "project.dueDate" })}
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700"
              />
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={isBusy || !name.trim() || !startDate || !endDate}
            className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {intl.formatMessage({
              id: editingSprint ? "app.saveChanges" : "project.sprint.create",
            })}
          </button>
        </div>
      </form>
    </div>
  );
}
