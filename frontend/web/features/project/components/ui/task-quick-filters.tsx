"use client";

import { ChevronDown } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  TaskPriority,
  TaskStatus,
  type ProjectMember,
} from "@/features/project/types/project";
import {
  TASK_STATUS_SELECT_OPTIONS,
  TASK_PRIORITY_SELECT_OPTIONS,
  TASK_KIND_QUICK_FILTER_OPTIONS,
  TASK_FILTER_LABELS,
  TASK_ASSIGNEE_FILTER_OPTIONS,
} from "@/features/project/constants/task.constants";

export type TaskKindFilter = "ALL" | "PARENT" | "TASK" | "SUBTASK";

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const isActive = value !== "" && value !== "ALL";

  return (
    <label className="relative min-w-[150px] flex-1 sm:flex-none">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "h-9 w-full appearance-none rounded-md border bg-white py-0 pl-3 pr-8 text-xs font-semibold outline-none transition sm:w-[168px]",
          isActive
            ? "border-[#0052CC] bg-blue-50/60 text-[#0747A6] ring-1 ring-[#0052CC]/10"
            : "border-slate-300 text-slate-500 hover:border-slate-400 focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10",
        ].join(" ")}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

export default function TaskQuickFilters({
  members,
  status,
  priority,
  assignee,
  taskKind,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onTaskKindChange,
}: {
  members: ProjectMember[];
  status: TaskStatus | "";
  priority: TaskPriority | "";
  assignee: string;
  taskKind: TaskKindFilter;
  onStatusChange: (value: TaskStatus | "") => void;
  onPriorityChange: (value: TaskPriority | "") => void;
  onAssigneeChange: (value: string) => void;
  onTaskKindChange: (value: TaskKindFilter) => void;
}) {
  const intl = useAppIntl();
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex-none">
      <FilterSelect
        label={intl.formatMessage({ id: TASK_FILTER_LABELS.STATUS_ALL })}
        value={status}
        onChange={(value) => onStatusChange(value as TaskStatus | "")}
      >
        <option value="">
          {intl.formatMessage({ id: TASK_FILTER_LABELS.STATUS_ALL })}
        </option>
        {TASK_STATUS_SELECT_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {intl.formatMessage({ id: item.labelId })}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label={intl.formatMessage({ id: TASK_FILTER_LABELS.PRIORITY_ALL })}
        value={priority}
        onChange={(value) => onPriorityChange(value as TaskPriority | "")}
      >
        <option value="">
          {intl.formatMessage({ id: TASK_FILTER_LABELS.PRIORITY_ALL })}
        </option>
        {TASK_PRIORITY_SELECT_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {intl.formatMessage({ id: item.labelId })}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label={intl.formatMessage({ id: TASK_FILTER_LABELS.ASSIGNEE_ALL })}
        value={assignee}
        onChange={onAssigneeChange}
      >
        {TASK_ASSIGNEE_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {intl.formatMessage({ id: opt.labelId })}
          </option>
        ))}
        {members.map((member) => (
          <option key={member.id} value={member.userId}>
            {member.displayName}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label={intl.formatMessage({ id: TASK_KIND_QUICK_FILTER_OPTIONS[0].labelId })}
        value={taskKind}
        onChange={(value) => onTaskKindChange(value as TaskKindFilter)}
      >
        {TASK_KIND_QUICK_FILTER_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {intl.formatMessage({ id: item.labelId })}
          </option>
        ))}
      </FilterSelect>
    </div>
  );
}
