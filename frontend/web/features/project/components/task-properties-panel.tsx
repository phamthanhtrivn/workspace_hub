"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { type ProjectMember, type Task, TaskPriority } from "../types/project";
import { TASK_DRAWER_PRIORITY_OPTIONS } from "../constants/task.constants";
import { taskDateKey } from "../utils/task-dates";
import { Avatar } from "./avatar-stack";
import { getPriorityIcon } from "./task-card";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset estimate draft when task changes
    setEstimateDraft(
      task.estimatedMinutes > 0 ? String(task.estimatedMinutes) : "",
    );
  }, [task.id, task.estimatedMinutes]);

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

  const assignedUser = task.assignees[0];

  const handleEstimateBlur = async () => {
    if (isReadOnly) return;
    const nextValue = estimateDraft.trim() === "" ? 0 : Number(estimateDraft);
    if (!Number.isInteger(nextValue) || nextValue < 0) {
      setEstimateDraft(
        task.estimatedMinutes > 0 ? String(task.estimatedMinutes) : "",
      );
      toast.error("Thời gian ước tính phải là số nguyên không âm");
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
    <div className="select-none overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-150 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700">
        Chi tiết (Details)
      </div>
      <div className="divide-y divide-slate-100 text-xs">
        {/* Assignee */}
        <div
          className="flex flex-col gap-1 px-3 py-2.5"
          ref={assigneeDropdownRef}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Người thực hiện
          </span>
          <div className="relative">
            <div
              onClick={
                isReadOnly
                  ? undefined
                  : () => setShowAssigneeDropdown((prev) => !prev)
              }
              className={`-ml-1 flex items-center justify-between rounded p-1 transition ${
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
                    <span className="font-semibold text-slate-700">
                      {assignedUser.displayName}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-[10px] font-bold text-slate-400">
                      ?
                    </div>
                    <span className="font-medium italic text-slate-400">
                      Chưa gán
                    </span>
                  </>
                )}
              </div>
              {!isReadOnly && (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </div>

            {showAssigneeDropdown && !isReadOnly && (
              <div className="absolute left-0 z-20 mt-1 max-h-48 w-full overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssigneeDropdown(false);
                    void onAssigneeChange(null);
                  }}
                  className="flex w-full items-center px-3 py-1.5 text-left text-xs font-semibold italic text-slate-500 hover:bg-slate-100"
                >
                  Hủy giao việc
                </button>
                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setShowAssigneeDropdown(false);
                      void onAssigneeChange(member.userId);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
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
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Priority */}
        <div
          className="flex flex-col gap-1 px-3 py-2.5"
          ref={priorityDropdownRef}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Độ ưu tiên
          </span>
          <div className="relative">
            <div
              onClick={
                isReadOnly
                  ? undefined
                  : () => setShowPriorityDropdown((prev) => !prev)
              }
              className={`-ml-1 flex items-center justify-between rounded p-1 transition ${
                isReadOnly
                  ? "cursor-default"
                  : "cursor-pointer hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {getPriorityIcon(task.priority)}
                <span className="font-semibold capitalize text-slate-700">
                  {task.priority.toLowerCase()}
                </span>
              </div>
              {!isReadOnly && (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </div>

            {showPriorityDropdown && !isReadOnly && (
              <div className="absolute left-0 z-20 mt-1 w-full rounded border border-slate-200 bg-white py-1 shadow-lg">
                {TASK_DRAWER_PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setShowPriorityDropdown(false);
                      void onPriorityChange(opt.value);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {getPriorityIcon(opt.value)}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1 px-3 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Ngày bắt đầu
          </span>
          <input
            type="date"
            value={taskDateKey(task.startDate, task.allDay)}
            onChange={(e) => void onStartDateChange(e.target.value)}
            disabled={isReadOnly}
            className="w-full cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-slate-700 outline-none focus:ring-0 disabled:cursor-default"
          />
        </div>

        {/* Due Date */}
        <div className="flex flex-col gap-1 px-3 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Hạn hoàn thành
          </span>
          <input
            type="date"
            value={taskDateKey(task.dueDate, task.allDay)}
            onChange={(e) => void onDueDateChange(e.target.value)}
            disabled={isReadOnly}
            className="w-full cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-slate-700 outline-none focus:ring-0 disabled:cursor-default"
          />
        </div>

        {/* Estimate */}
        <div className="flex flex-col gap-1 px-3 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Ước tính (Phút)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="Ví dụ: 60"
            value={estimateDraft}
            onChange={(e) => setEstimateDraft(e.target.value)}
            onBlur={() => void handleEstimateBlur()}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            disabled={isReadOnly}
            className="w-full cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-slate-700 outline-none focus:ring-0 disabled:cursor-default"
          />
        </div>

        {/* Reporter */}
        <div className="flex flex-col gap-0.5 px-3 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Người báo cáo
          </span>
          <span className="mt-0.5 block font-semibold text-slate-600">
            {memberDisplayName(task.reporterId)}
          </span>
        </div>

        {/* Timestamps */}
        <div className="flex flex-col gap-0.5 bg-slate-50/30 px-3 py-2.5 text-[10px] font-semibold text-slate-400">
          <div>Tạo: {formatDateTime(task.createdAt)}</div>
          <div>Cập nhật: {formatDateTime(task.updatedAt)}</div>
        </div>
      </div>
    </div>
  );
}
