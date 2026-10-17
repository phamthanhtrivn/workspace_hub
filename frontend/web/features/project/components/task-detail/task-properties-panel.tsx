"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Layers } from "lucide-react";
import {
  type ProjectMember,
  type Task,
  type TaskDependency,
  TaskPriority,
} from "@/features/project/types/project";
import {
  TASK_DRAWER_PRIORITY_OPTIONS,
  TASK_PRIORITY_LABELS,
} from "@/features/project/constants/task.constants";
import {
  taskDateKey,
  formatTaskDateTime,
  toDateTimeInput,
} from "@/features/project/utils/task-dates";
import { Avatar } from "../ui/avatar-stack";
import { getPriorityIcon } from "../ui/task-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomCheckbox } from "@/components/ui/custom/custom-checkbox";
import { ProjectSelect } from "../ui/project-form-controls";

interface TaskPropertiesPanelProps {
  task: Task;
  tasks: Task[];
  dependencies: TaskDependency[];
  members: ProjectMember[];
  isReadOnly: boolean;
  memberDisplayName: (userId?: string | null) => string;
  onAssigneeChange: (userId: string | null) => Promise<void> | void;
  onPriorityChange: (priority: TaskPriority) => Promise<void> | void;
  onParentTaskChange: (parentTaskId: string) => Promise<void> | void;
  onAllDayChange: (allDay: boolean) => Promise<void> | void;
  onStartDateChange: (val: string) => Promise<void> | void;
  onDueDateChange: (val: string) => Promise<void> | void;
}

export default function TaskPropertiesPanel({
  task,
  tasks,
  dependencies,
  members,
  isReadOnly,
  memberDisplayName,
  onAssigneeChange,
  onPriorityChange,
  onParentTaskChange,
  onAllDayChange,
  onStartDateChange,
  onDueDateChange,
}: TaskPropertiesPanelProps) {
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const hasChildTasks = tasks.some((candidate) => candidate.parentTaskId === task.id);

  const parentTaskOptions = [
    { value: "", label: "No Parent Task (Independent)" },
    ...tasks
      .filter(
        (candidate) =>
          !hasChildTasks &&
          candidate.id !== task.id &&
          !candidate.parentTaskId &&
          !dependencies.some(
            (dependency) =>
              (dependency.predecessorTaskId === task.id &&
                dependency.successorTaskId === candidate.id) ||
              (dependency.predecessorTaskId === candidate.id &&
                dependency.successorTaskId === task.id),
          ),
      )
      .map((candidate) => ({
        value: candidate.id,
        label: candidate.title,
      })),
  ];
  const startDateValue = task.allDay
    ? taskDateKey(task.startDate, true)
    : toDateTimeInput(task.startDate);
  const dueDateValue = task.allDay
    ? taskDateKey(task.dueDate, true)
    : toDateTimeInput(task.dueDate);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAssigneeDropdown(false);
      }
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPriorityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const taskAssignee = task.assignees[0];
  const assignedMember = taskAssignee
    ? members.find((member) => member.userId === taskAssignee.userId)
    : undefined;
  const assignedUser = taskAssignee
    ? {
        ...taskAssignee,
        displayName:
          assignedMember?.displayName ||
          taskAssignee.displayName ||
          memberDisplayName(taskAssignee.userId),
        avatarUrl: assignedMember?.avatarUrl || taskAssignee.avatarUrl,
      }
    : undefined;
  const reporterMember = members.find((member) => member.userId === task.reporterId);
  const reporterName =
    reporterMember?.displayName || memberDisplayName(task.reporterId);
  const reporterUser = {
    userId: task.reporterId,
    displayName: reporterName,
    avatarUrl: reporterMember?.avatarUrl,
  };

  return (
    <div className="select-none overflow-hidden rounded-panel border border-border bg-card">
      <div className="border-b border-border bg-background px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground">
        Task Details
      </div>
      <div className="divide-y divide-border text-xs">
        {/* Assignee */}
        <div
          className="flex flex-col gap-1 px-3.5 py-2.5"
          ref={assigneeDropdownRef}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Assignee
          </span>
          <div className="relative">
            <div
              onClick={
                isReadOnly
                  ? undefined
                  : () => setShowAssigneeDropdown((prev) => !prev)
              }
              className={`-ml-1 flex items-center justify-between rounded-lg p-1.5 transition ${
                isReadOnly
                  ? "cursor-default"
                  : "cursor-pointer hover:bg-background"
              }`}
            >
              <div className="flex items-center gap-2">
                {assignedUser ? (
                  <>
                    <Avatar
                      user={{
                        userId: assignedUser.userId,
                        displayName: assignedUser.displayName,
                        avatarUrl: assignedUser.avatarUrl,
                      }}
                      size="xs"
                    />
                    <span className="font-semibold text-foreground">
                      {assignedUser.displayName}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-input bg-background text-xs font-semibold text-muted-foreground">
                      ?
                    </div>
                    <span className="font-medium italic text-muted-foreground">
                      Unassigned
                    </span>
                  </>
                )}
              </div>
              {!isReadOnly && (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>

            {showAssigneeDropdown && !isReadOnly && (
              <div className="absolute left-0 z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-panel border border-border bg-card py-1 shadow-panel">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAssigneeDropdown(false);
                    void onAssigneeChange(null);
                  }}
                  className="flex w-full h-auto justify-start rounded-none cursor-pointer items-center px-3 py-1.5 text-left text-xs font-semibold italic text-muted-foreground hover:bg-background"
                >
                  Unassign
                </Button>
                {members.map((member) => (
                  <Button
                    key={member.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAssigneeDropdown(false);
                      void onAssigneeChange(member.userId);
                    }}
                    className="flex w-full h-auto justify-start rounded-none cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-background"
                  >
                    <Avatar
                      user={{
                        userId: member.userId,
                        displayName: member.displayName,
                        avatarUrl: member.avatarUrl,
                      }}
                      size="xs"
                    />
                    <span>{member.displayName}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Priority */}
        <div
          className="flex flex-col gap-1 px-3.5 py-2.5"
          ref={priorityDropdownRef}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Priority
          </span>
          <div className="relative">
            <div
              onClick={
                isReadOnly
                  ? undefined
                  : () => setShowPriorityDropdown((prev) => !prev)
              }
              className={`-ml-1 flex items-center justify-between rounded-lg p-1.5 transition ${
                isReadOnly
                  ? "cursor-default"
                  : "cursor-pointer hover:bg-background"
              }`}
            >
              <div className="flex items-center gap-2">
                {getPriorityIcon(task.priority)}
                <span className="font-semibold text-foreground">
                  {TASK_PRIORITY_LABELS[task.priority]}
                </span>
              </div>
              {!isReadOnly && (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>

            {showPriorityDropdown && !isReadOnly && (
              <div className="absolute left-0 z-20 mt-1 w-full overflow-hidden rounded-panel border border-border bg-card py-1 shadow-panel">
                {TASK_DRAWER_PRIORITY_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPriorityDropdown(false);
                      void onPriorityChange(opt.value);
                    }}
                    className="flex w-full h-auto justify-start rounded-none cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-background"
                  >
                    {getPriorityIcon(opt.value)}
                    <span>{opt.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Parent Task */}
        <div className="flex flex-col gap-1 px-3.5 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3 w-3" strokeWidth={2} />
            Parent Task
          </span>
          <ProjectSelect
            value={task.parentTaskId || ""}
            options={parentTaskOptions}
            onChange={onParentTaskChange}
            ariaLabel="Select parent task"
            disabled={isReadOnly}
            className="w-full"
            triggerClassName="h-8 rounded-lg px-2.5 text-xs"
            contentClassName="max-h-56"
          />
        </div>

        {/* All Day */}
        <div className="flex flex-col gap-1 px-3.5 py-2.5">
          <CustomCheckbox
            checked={task.allDay}
            disabled={isReadOnly}
            onCheckedChange={(checked) => void onAllDayChange(Boolean(checked))}
            label="All Day Event"
            description="Switch between date-only and date-time scheduling."
            className="items-start gap-2 rounded-lg border border-border bg-background px-2.5 py-2"
            checkboxClassName="mt-0.5 cursor-pointer data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            labelClassName="text-xs font-semibold text-foreground"
            descriptionClassName="text-xs"
          />
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1 px-3.5 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarDays className="h-3 w-3" strokeWidth={2} />
            {task.allDay ? "Start Date" : "Start Date & Time"}
          </span>
          <Input
            type={task.allDay ? "date" : "datetime-local"}
            value={startDateValue}
            onChange={(e) => void onStartDateChange(e.target.value)}
            disabled={isReadOnly}
            className="h-8 w-full rounded-control border-input bg-card px-2.5 text-xs font-semibold text-foreground"
          />
        </div>

        {/* Due Date */}
        <div className="flex flex-col gap-1 px-3.5 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarDays className="h-3 w-3" strokeWidth={2} />
            {task.allDay ? "Due Date" : "Due Date & Time"}
          </span>
          <Input
            type={task.allDay ? "date" : "datetime-local"}
            value={dueDateValue}
            onChange={(e) => void onDueDateChange(e.target.value)}
            disabled={isReadOnly}
            className="h-8 w-full rounded-control border-input bg-card px-2.5 text-xs font-semibold text-foreground"
          />
        </div>

        {/* Reporter */}
        <div className="flex flex-col gap-1 px-3.5 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reporter
          </span>
          <div className="-ml-1 flex items-center gap-2 rounded-lg p-1.5">
            <Avatar user={reporterUser} size="xs" />
            <span className="font-semibold text-foreground">
              {reporterName}
            </span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex flex-col gap-0.5 bg-background px-3.5 py-2.5 text-xs font-semibold text-muted-foreground">
          <div>
            Created: {formatTaskDateTime(task.createdAt)}
          </div>
          <div>
            Updated: {formatTaskDateTime(task.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
