"use client";

import { ChevronDown } from "lucide-react";
import {
  TaskPriority,
  TaskStatus,
  type ProjectMember,
} from "@/features/project/types/project";

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
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex-none">
      <FilterSelect
        label="Trạng thái"
        value={status}
        onChange={(value) => onStatusChange(value as TaskStatus | "")}
      >
        <option value="">Trạng thái</option>
        <option value={TaskStatus.TODO}>TO DO</option>
        <option value={TaskStatus.IN_PROGRESS}>IN PROGRESS</option>
        <option value={TaskStatus.IN_REVIEW}>IN REVIEW</option>
        <option value={TaskStatus.DONE}>DONE</option>
        <option value={TaskStatus.CANCELLED}>ĐÃ HỦY</option>
      </FilterSelect>

      <FilterSelect
        label="Độ ưu tiên"
        value={priority}
        onChange={(value) => onPriorityChange(value as TaskPriority | "")}
      >
        <option value="">Độ ưu tiên</option>
        <option value={TaskPriority.URGENT}>Khẩn cấp</option>
        <option value={TaskPriority.HIGH}>Cao</option>
        <option value={TaskPriority.MEDIUM}>Trung bình</option>
        <option value={TaskPriority.LOW}>Thấp</option>
      </FilterSelect>

      <FilterSelect
        label="Người thực hiện"
        value={assignee}
        onChange={onAssigneeChange}
      >
        <option value="">Người thực hiện</option>
        <option value="UNASSIGNED">Chưa giao</option>
        {members.map((member) => (
          <option key={member.id} value={member.userId}>
            {member.displayName}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Loại yêu cầu"
        value={taskKind}
        onChange={(value) => onTaskKindChange(value as TaskKindFilter)}
      >
        <option value="ALL">Yêu cầu</option>
        <option value="PARENT">Task cha</option>
        <option value="TASK">Task thường</option>
        <option value="SUBTASK">Subtask</option>
      </FilterSelect>
    </div>
  );
}
