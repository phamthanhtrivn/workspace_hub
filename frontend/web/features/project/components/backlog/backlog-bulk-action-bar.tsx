"use client";

import { TaskStatus, type Sprint } from "@/features/project/types/project";
import {
  TASK_STATUS_OPTIONS,
} from "@/features/project/constants/task.constants";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface BacklogBulkActionBarProps {
  selectedCount: number;
  plannedSprints: Sprint[];
  targetSprintId: string;
  onTargetSprintChange: (id: string) => void;
  onAddTasksToSprint: () => Promise<void> | void;
  bulkStatus: TaskStatus;
  onBulkStatusChange: (status: TaskStatus) => void;
  onApplyBulkStatus?: () => Promise<void> | void;
  isBusy?: boolean;
}

export default function BacklogBulkActionBar({
  selectedCount,
  plannedSprints,
  targetSprintId,
  onTargetSprintChange,
  onAddTasksToSprint,
  bulkStatus,
  onBulkStatusChange,
  onApplyBulkStatus,
  isBusy = false,
}: BacklogBulkActionBarProps) {
  const intl = useAppIntl();

  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3">
      <span className="text-xs font-bold text-blue-800">
        {intl.formatMessage(
          { id: "project.backlog.selectedTasks" },
          { count: selectedCount },
        )}
      </span>
      <select
        value={targetSprintId}
        onChange={(event) => onTargetSprintChange(event.target.value)}
        className="rounded border border-blue-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
      >
        <option value="">
          {intl.formatMessage({ id: "project.backlog.selectSprint" })}
        </option>
        {plannedSprints.map((sprint) => (
          <option key={sprint.id} value={sprint.id}>
            {sprint.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!targetSprintId || isBusy}
        onClick={() => void onAddTasksToSprint()}
        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {intl.formatMessage({ id: "project.backlog.moveToSprint" })}
      </button>
      <select
        value={bulkStatus}
        onChange={(event) =>
          onBulkStatusChange(event.target.value as TaskStatus)
        }
        className="rounded border border-blue-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
        aria-label={intl.formatMessage({
          id: "project.backlog.bulkStatusAria",
        })}
      >
        {TASK_STATUS_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {intl.formatMessage({ id: item.labelId })}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={isBusy || !onApplyBulkStatus}
        onClick={() => void onApplyBulkStatus?.()}
        className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 transition disabled:opacity-50"
      >
        {intl.formatMessage({ id: "project.backlog.changeStatus" })}
      </button>
    </div>
  );
}
