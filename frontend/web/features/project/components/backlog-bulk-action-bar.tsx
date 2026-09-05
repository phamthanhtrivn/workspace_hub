"use client";

import { TaskStatus, type Sprint } from "../types/project";

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
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3">
      <span className="text-xs font-bold text-blue-800">
        {selectedCount} task đã chọn
      </span>
      <select
        value={targetSprintId}
        onChange={(event) => onTargetSprintChange(event.target.value)}
        className="rounded border border-blue-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
      >
        <option value="">Chọn Sprint...</option>
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
        Đưa vào Sprint
      </button>
      <select
        value={bulkStatus}
        onChange={(event) =>
          onBulkStatusChange(event.target.value as TaskStatus)
        }
        className="rounded border border-blue-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
        aria-label="Trạng thái mới cho task đã chọn"
      >
        <option value={TaskStatus.TODO}>To Do</option>
        <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
        <option value={TaskStatus.IN_REVIEW}>In Review</option>
        <option value={TaskStatus.DONE}>Done</option>
        <option value={TaskStatus.CANCELLED}>Đã hủy</option>
      </select>
      <button
        type="button"
        disabled={isBusy || !onApplyBulkStatus}
        onClick={() => void onApplyBulkStatus?.()}
        className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 transition disabled:opacity-50"
      >
        Đổi trạng thái
      </button>
    </div>
  );
}
