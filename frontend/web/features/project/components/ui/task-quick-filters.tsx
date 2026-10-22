"use client";

import {
  TaskPriority,
  TaskStatus,
  type ProjectMember,
} from "@/features/project/types/project";
import {
  TASK_STATUS_SELECT_OPTIONS,
  TASK_PRIORITY_SELECT_OPTIONS,
} from "@/features/project/constants/task.constants";
import { ProjectSelect } from "./project-form-controls";

export default function TaskQuickFilters({
  members,
  status,
  priority,
  assignee,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
}: {
  members: ProjectMember[];
  status: TaskStatus | "";
  priority: TaskPriority | "";
  assignee: string;
  onStatusChange: (value: TaskStatus | "") => void;
  onPriorityChange: (value: TaskPriority | "") => void;
  onAssigneeChange: (value: string) => void;
}) {
  const statusOptions = [
    { value: "", label: "All Statuses" },
    ...TASK_STATUS_SELECT_OPTIONS.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  ];

  const priorityOptions = [
    { value: "", label: "All Priorities" },
    ...TASK_PRIORITY_SELECT_OPTIONS.map((item) => ({
      value: item.value,
      label: item.label,
    })),
  ];

  const assigneeOptions = [
    { value: "", label: "All Assignees" },
    { value: "UNASSIGNED", label: "Unassigned" },
    ...members.map((member) => ({
      value: member.userId,
      label: member.displayName,
    })),
  ];

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-2 @min-[480px]/project-detail:grid-cols-3 @min-[800px]/project-detail:w-auto @min-[800px]/project-detail:flex-none">
      <ProjectSelect
        value={status}
        options={statusOptions}
        onChange={(val) => onStatusChange(val as TaskStatus | "")}
        ariaLabel="Filter by status"
        className="w-full min-w-0 @min-[800px]/project-detail:w-32"
      />

      <ProjectSelect
        value={priority}
        options={priorityOptions}
        onChange={(val) => onPriorityChange(val as TaskPriority | "")}
        ariaLabel="Filter by priority"
        className="w-full min-w-0 @min-[800px]/project-detail:w-32"
      />

      <ProjectSelect
        value={assignee}
        options={assigneeOptions}
        onChange={onAssigneeChange}
        ariaLabel="Filter by assignee"
        className="w-full min-w-0 @min-[800px]/project-detail:w-36"
      />
    </div>
  );
}
