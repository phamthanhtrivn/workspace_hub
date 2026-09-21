"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  type ProjectMember,
  type Task,
  TaskPriority,
} from "@/features/project/types/project";
import {
  TASK_DRAWER_PRIORITY_OPTIONS,
  TASK_PRIORITY_LABELS,
} from "@/features/project/constants/task.constants";
import {
  taskDateKey,
  formatTaskDateTime,
} from "@/features/project/utils/task-dates";
import { Avatar } from "../ui/avatar-stack";
import { getPriorityIcon } from "../ui/task-card";
import { TaskDurationSelect } from "../forms/task-duration-select";
import { TASK_DURATION_PRESETS } from "@/features/project/utils/task-duration.utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskPropertiesPanelProps {
  task: Task;
  members: ProjectMember[];
  isReadOnly: boolean;
  memberDisplayName: (userId?: string | null) => string;
  onAssigneeChange: (userId: string | null) => Promise<void> | void;
  onPriorityChange: (priority: TaskPriority) => Promise<void> | void;
  onStartDateChange: (val: string) => Promise<void> | void;
  onDueDateChange: (val: string) => Promise<void> | void;
  onEstimateSave: (estimateMinutes: number) => Promise<void> | void;
}

export default function TaskPropertiesPanel({
  task,
  members,
  isReadOnly,
  memberDisplayName,
  onAssigneeChange,
  onPriorityChange,
  onStartDateChange,
  onDueDateChange,
  onEstimateSave,
}: TaskPropertiesPanelProps) {
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [estimateDraft, setEstimateDraft] = useState(
    task.estimatedMinutes > 0 ? String(task.estimatedMinutes) : "",
  );

  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

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

  const handleEstimateBlur = async () => {
    if (isReadOnly) return;
    const nextValue = estimateDraft.trim() === "" ? 0 : Number(estimateDraft);
    if (!Number.isInteger(nextValue) || nextValue < 0) {
      setEstimateDraft(
        task.estimatedMinutes > 0 ? String(task.estimatedMinutes) : "",
      );
      toast.error("Please enter a valid positive duration in minutes");
      return;
    }
    if (nextValue === task.estimatedMinutes) return;
    try {
      await onEstimateSave(nextValue);
    } catch {
      setEstimateDraft(
        task.estimatedMinutes > 0 ? String(task.estimatedMinutes) : "",
      );
    }
  };

  return (
    <div className="select-none overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="border-b border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-700">
        Task Details
      </div>
      <div className="divide-y divide-slate-100 text-xs">
        {/* Assignee */}
        <div
          className="flex flex-col gap-1 px-3.5 py-2.5"
          ref={assigneeDropdownRef}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                  : "cursor-pointer hover:bg-slate-50"
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
                    <span className="font-semibold text-slate-800">
                      {assignedUser.displayName}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-400">
                      ?
                    </div>
                    <span className="font-medium italic text-slate-400">
                      Unassigned
                    </span>
                  </>
                )}
              </div>
              {!isReadOnly && (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </div>

            {showAssigneeDropdown && !isReadOnly && (
              <div className="absolute left-0 z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAssigneeDropdown(false);
                    void onAssigneeChange(null);
                  }}
                  className="flex w-full h-auto justify-start rounded-none cursor-pointer items-center px-3 py-1.5 text-left text-xs font-semibold italic text-slate-500 hover:bg-slate-50"
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
                    className="flex w-full h-auto justify-start rounded-none cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                  : "cursor-pointer hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {getPriorityIcon(task.priority)}
                <span className="font-semibold text-slate-700">
                  {TASK_PRIORITY_LABELS[task.priority]}
                </span>
              </div>
              {!isReadOnly && (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </div>

            {showPriorityDropdown && !isReadOnly && (
              <div className="absolute left-0 z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
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
                    className="flex w-full h-auto justify-start rounded-none cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {getPriorityIcon(opt.value)}
                    <span>{opt.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1 px-3.5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Start Date
          </span>
          <Input
            type="date"
            value={taskDateKey(task.startDate, task.allDay)}
            onChange={(e) => void onStartDateChange(e.target.value)}
            disabled={isReadOnly}
            className="h-8 w-full rounded-lg border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
          />
        </div>

        {/* Due Date */}
        <div className="flex flex-col gap-1 px-3.5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Due Date
          </span>
          <Input
            type="date"
            value={taskDateKey(task.dueDate, task.allDay)}
            onChange={(e) => void onDueDateChange(e.target.value)}
            disabled={isReadOnly}
            className="h-8 w-full rounded-lg border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
          />
        </div>

        {/* Estimate */}
        <div className="flex flex-col gap-1 px-3.5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Estimated Duration
          </span>
          <TaskDurationSelect
            key={task.id}
            value={estimateDraft}
            onValueChange={setEstimateDraft}
            onPresetSelect={(minutes) => void onEstimateSave(minutes)}
            onCustomCommit={() => void handleEstimateBlur()}
            disabled={isReadOnly}
            compact
          />
          {!isReadOnly && estimateDraft !== "" &&
            !TASK_DURATION_PRESETS.some(
              (preset) => preset === Number(estimateDraft),
            ) && (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => void handleEstimateBlur()}
                className="h-auto self-start p-0 text-[10px] font-bold text-[#0052CC] hover:underline cursor-pointer"
              >
                Save estimate
              </Button>
            )}
        </div>

        {/* Reporter */}
        <div className="flex flex-col gap-0.5 px-3.5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Reporter
          </span>
          <span className="mt-0.5 block font-semibold text-slate-700">
            {memberDisplayName(task.reporterId)}
          </span>
        </div>

        {/* Timestamps */}
        <div className="flex flex-col gap-0.5 bg-slate-50/50 px-3.5 py-2.5 text-[10px] font-semibold text-slate-400">
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
