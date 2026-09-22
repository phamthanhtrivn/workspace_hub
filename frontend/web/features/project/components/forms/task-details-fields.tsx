"use client";

import { Flag, Layers } from "lucide-react";
import { TASK_PRIORITY_OPTIONS } from "@/features/project/constants/task.constants";
import { TaskPriority, type Task } from "@/features/project/types/project";
import { ProjectSelect } from "../ui/project-form-controls";

interface TaskDetailsFieldsProps {
  priority: TaskPriority;
  onPriorityChange: (priority: TaskPriority) => void;
  parentTaskId: string;
  onParentTaskIdChange: (parentTaskId: string) => void;
  parentTasks?: Task[];
  currentTaskId?: string;
}

export function TaskDetailsFields({
  priority,
  onPriorityChange,
  parentTaskId,
  onParentTaskIdChange,
  parentTasks = [],
  currentTaskId,
}: TaskDetailsFieldsProps) {
  const priorityOptions = TASK_PRIORITY_OPTIONS.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  const parentTaskOptions = [
    { value: "", label: "No Parent Task (Independent)" },
    ...parentTasks
      .filter(
        (candidate) =>
          candidate.id !== currentTaskId && !candidate.parentTaskId,
      )
      .map((candidate) => ({
        value: candidate.id,
        label: candidate.title,
      })),
  ];

  return (
    <section className="border-t border-slate-100 pt-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-bold text-slate-900">
          Task Details
        </span>
        <span className="text-xs text-slate-400">
          (Priority and hierarchical grouping)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Flag className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
            Priority
          </span>
          <ProjectSelect
            value={priority}
            options={priorityOptions}
            onChange={(val) => onPriorityChange(val as TaskPriority)}
            ariaLabel="Select task priority"
            className="w-full h-11"
          />
        </div>

        <div>
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Layers className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
            Parent Task
          </span>
          <ProjectSelect
            value={parentTaskId}
            options={parentTaskOptions}
            onChange={onParentTaskIdChange}
            ariaLabel="Select parent task"
            className="w-full h-11"
          />
          <span className="mt-1 block text-[11px] text-slate-400">
            Attach this task as a subtask under an existing parent task.
          </span>
        </div>
      </div>
    </section>
  );
}
