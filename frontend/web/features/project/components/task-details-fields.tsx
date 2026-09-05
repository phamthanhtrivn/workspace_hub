import React from "react";
import { CheckSquare2, ChevronDown, Flag } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/features/project/constants/task.constants";
import {
  TaskPriority,
  TaskStatus,
  TaskType,
  type Task,
} from "@/features/project/types/project";

interface TaskDetailsFieldsProps {
  taskType: TaskType;
  onTaskTypeChange: (type: TaskType) => void;
  status: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  priority: TaskPriority;
  onPriorityChange: (priority: TaskPriority) => void;
  parentTaskId: string;
  onParentTaskIdChange: (parentTaskId: string) => void;
  parentTasks?: Task[];
  currentTaskId?: string;
  isParentTask?: boolean;
}

export function TaskDetailsFields({
  taskType,
  onTaskTypeChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  parentTaskId,
  onParentTaskIdChange,
  parentTasks = [],
  currentTaskId,
  isParentTask = false,
}: TaskDetailsFieldsProps) {
  const intl = useAppIntl();

  return (
    <section className="border-t border-slate-100 pt-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-black text-[var(--color-primary-dark)]">
          {intl.formatMessage({ id: "project.details" })}
        </span>
        <span className="text-xs text-slate-400">
          {intl.formatMessage({ id: "project.task.managementInfo" })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <CheckSquare2
              className="h-3.5 w-3.5 text-slate-400"
              strokeWidth={2}
            />
            Loại công việc
          </span>
          <div className="relative">
            <select
              value={taskType}
              disabled={Boolean(parentTaskId) || isParentTask}
              onChange={(event) =>
                onTaskTypeChange(event.target.value as TaskType)
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10 disabled:bg-slate-50"
            >
              <option value={TaskType.TASK}>Task</option>
              <option value={TaskType.BUG}>Bug</option>
              <option value={TaskType.STORY}>Story</option>
              <option value={TaskType.EPIC}>Epic</option>
              <option value={TaskType.SUBTASK}>Subtask</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <ChevronDown
              className="h-3.5 w-3.5 text-slate-400"
              strokeWidth={2}
            />
            {intl.formatMessage({ id: "project.task.status" })}
          </span>
          <div className="relative">
            <select
              value={status}
              onChange={(event) =>
                onStatusChange(event.target.value as TaskStatus)
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
            >
              {TASK_STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {intl.formatMessage({ id: item.labelId })}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Flag className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
            {intl.formatMessage({ id: "project.task.priority" })}
          </span>
          <div className="relative">
            <select
              value={priority}
              onChange={(event) =>
                onPriorityChange(event.target.value as TaskPriority)
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10"
            >
              {TASK_PRIORITY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {intl.formatMessage({ id: item.labelId })}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <ChevronDown
              className="h-3.5 w-3.5 text-slate-400"
              strokeWidth={2}
            />
            {intl.formatMessage({ id: "project.task.parentTask" })}
          </span>
          <div className="relative">
            <select
              value={parentTaskId}
              disabled={isParentTask}
              onChange={(event) => {
                const nextParentId = event.target.value;
                onParentTaskIdChange(nextParentId);
                onTaskTypeChange(
                  nextParentId ? TaskType.SUBTASK : TaskType.TASK,
                );
              }}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10 disabled:bg-slate-50"
            >
              <option value="">
                {intl.formatMessage({ id: "project.task.noParentTask" })}
              </option>
              {parentTasks
                .filter(
                  (candidate) =>
                    candidate.id !== currentTaskId && !candidate.parentTaskId,
                )
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <span className="mt-1 block text-[11px] text-slate-400">
            {intl.formatMessage({ id: "project.task.parentTaskHint" })}
          </span>
        </label>
      </div>
    </section>
  );
}
