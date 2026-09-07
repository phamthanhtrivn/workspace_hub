"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  type TaskLabel,
  TaskStatus,
  TaskPriority,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import { useTaskActivities } from "@/features/project/hooks/use-tasks";
import type { TaskDetailDrawerProps } from "../types/task-detail-drawer.types";
import { TaskStatusBadge, LabelBadge } from "./status-badge";
import { Avatar } from "./avatar-stack";
import { getIssueKey, getIssueTypeDetails, getPriorityIcon } from "./task-card";
import TaskChatButton from "./task-chat-button";
import { createTaskActivityPresenter } from "@/features/project/task-activity-presenter";
import TaskActivityPanel from "./task-activity-panel";
import TaskChecklistSection from "./task-checklist-section";
import TaskCommentsSection from "./task-comments-section";
import {
  TASK_DRAWER_PRIORITY_OPTIONS,
  TASK_DRAWER_STATUS_OPTIONS,
} from "../constants/task.constants";
import {
  X,
  Pencil,
  Tag,
  History,
  FileText,
  ListTree,
  Plus,
  ChevronDown,
  Check,
  Link2,
  LockKeyhole,
} from "lucide-react";

type TaskDetailTab = "details" | "activity";
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TaskDetailDrawer({
  task,
  tasks = [],
  members = [],
  onClose,
  onOpenChat,
  onEdit,
  onTaskClick,
  onUpdateTask,
  onCreateSubtask,
  onCreateChecklist,
  onUpdateChecklist,
  onDeleteChecklist,
  labels = [],
  onToggleLabel,
  dependencies = [],
  onCreateDependency,
  onDeleteDependency,
  canEditTask = false,
}: TaskDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TaskDetailTab>("details");

  // Inline edit states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState("");

  // Dropdown open states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showDependencyDropdown, setShowDependencyDropdown] = useState(false);

  // References
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const {
    data: activities = [],
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
    refetch: refetchActivities,
  } = useTaskActivities(task?.id || "");
  const [estimateDraft, setEstimateDraft] = useState("");
  const isReadOnly = task
    ? isTerminalTaskStatus(task.status) || !canEditTask
    : true;

  // Detect clicks outside dropdowns
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
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset temp inputs when task changes
  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Draft fields must reset when the selected task changes.
      setTempTitle(task.title);
      setTempDesc(task.description || "");
      setEstimateDraft(
        task.estimatedMinutes > 0 ? String(task.estimatedMinutes) : "",
      );
      setIsEditingTitle(false);
      setIsEditingDesc(false);
      setActiveTab("details");
    }
  }, [task]);

  useEffect(() => {
    if (!task) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, task]);

  if (!task) return null;

  const childTasks = tasks.filter(
    (candidate) => candidate.parentTaskId === task.id && !candidate.archived,
  );
  const parentTask = task.parentTaskId
    ? tasks.find((candidate) => candidate.id === task.parentTaskId)
    : undefined;

  const issueKey = getIssueKey(task);
  const issueType = getIssueTypeDetails(task);
  const { memberDisplayName } = createTaskActivityPresenter(members, tasks);

  const handleTitleSave = async () => {
    if (isReadOnly) return;
    if (!tempTitle.trim() || tempTitle === task.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { title: tempTitle.trim() });
        toast.success("Đã cập nhật tiêu đề");
      }
      setIsEditingTitle(false);
    } catch {
      setTempTitle(task.title);
    }
  };

  const handleDescSave = async () => {
    if (isReadOnly) return;
    if (tempDesc === task.description) {
      setIsEditingDesc(false);
      return;
    }
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { description: tempDesc });
        toast.success("Đã cập nhật mô tả");
      }
      setIsEditingDesc(false);
    } catch {
      setTempDesc(task.description || "");
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (isReadOnly) return;
    setShowStatusDropdown(false);
    if (newStatus === task.status) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { status: newStatus });
        toast.success("Đã cập nhật trạng thái");
      }
    } catch {}
  };

  const handleAssigneeChange = async (userId: string) => {
    if (isReadOnly) return;
    setShowAssigneeDropdown(false);
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { assigneeUserId: userId });
        toast.success("Đã cập nhật người thực hiện");
      }
    } catch {}
  };

  const handleUnassign = async () => {
    if (isReadOnly) return;
    setShowAssigneeDropdown(false);
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { assigneeUserId: null, assignees: [] });
        toast.success("Đã hủy giao việc");
      }
    } catch {}
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    if (isReadOnly) return;
    setShowPriorityDropdown(false);
    if (priority === task.priority) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { priority });
        toast.success("Đã cập nhật độ ưu tiên");
      }
    } catch {}
  };

  const handleToggleLabel = async (label: TaskLabel) => {
    if (isReadOnly) return;
    if (!onToggleLabel) return;
    const attached = task.labels.some((item) => item.id === label.id);
    try {
      await onToggleLabel(task.id, label.id, attached);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật nhãn",
      );
    }
  };

  const taskDependencies = dependencies.filter(
    (dependency) => dependency.successorTaskId === task.id,
  );
  const dependencyCandidates = tasks.filter(
    (candidate) =>
      candidate.id !== task.id &&
      !candidate.archived &&
      !taskDependencies.some(
        (dependency) => dependency.predecessorTaskId === candidate.id,
      ),
  );

  const handleAddDependency = async (predecessorTaskId: string) => {
    if (isReadOnly) return;
    if (!onCreateDependency) return;
    try {
      await onCreateDependency(task.id, predecessorTaskId);
      setShowDependencyDropdown(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo dependency",
      );
    }
  };

  const handleDueDateChange = async (val: string) => {
    if (isReadOnly) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, {
          dueDate: val ? `${val}T17:00:00` : null,
        });
        toast.success("Đã cập nhật hạn hoàn thành");
      }
    } catch {}
  };

  const handleStartDateChange = async (val: string) => {
    if (isReadOnly) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, {
          startDate: val ? `${val}T09:00:00` : undefined,
        });
        toast.success("Đã cập nhật ngày bắt đầu");
      }
    } catch {}
  };

  const handleEstimateSave = async () => {
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
      if (onUpdateTask) {
        await onUpdateTask(task.id, { estimatedMinutes: nextValue });
        toast.success("Đã cập nhật thời gian ước lượng");
      }
    } catch {
      setEstimateDraft(
        task.estimatedMinutes > 0 ? String(task.estimatedMinutes) : "",
      );
    }
  };

  const handleTabChange = (tab: TaskDetailTab) => {
    setActiveTab(tab);
    if (tab === "activity") void refetchActivities();
  };

  const currentStatusOpt =
    TASK_DRAWER_STATUS_OPTIONS.find((opt) => opt.value === task.status) ||
    TASK_DRAWER_STATUS_OPTIONS[0];
  const assignedUser = task.assignees[0];

  // The core UI of the panel (without drawer wrapping container)
  const PanelContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* ── Panel Header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          {issueType.icon}
          <span className="text-[10px] font-bold uppercase text-slate-400">
            {issueType.label}
          </span>
          <span className="hover:underline font-semibold uppercase tracking-wide text-slate-700">
            {issueKey}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TaskChatButton task={task} onOpenChat={onOpenChat} />
          {onEdit && !isReadOnly && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="grid h-7 w-7 place-items-center rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              title="Mở form sửa chi tiết"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
            title="Đóng panel chi tiết"
            aria-label="Đóng chi tiết công việc"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div
        className="flex shrink-0 items-center gap-1 border-b border-slate-200 px-5"
        role="tablist"
        aria-label="Nội dung công việc"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "details"}
          onClick={() => handleTabChange("details")}
          className={[
            "flex items-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-bold transition",
            activeTab === "details"
              ? "border-[#0052CC] text-[#0052CC]"
              : "border-transparent text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          <FileText className="h-3.5 w-3.5" />
          Chi tiết
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "activity"}
          onClick={() => handleTabChange("activity")}
          className={[
            "flex items-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-bold transition",
            activeTab === "activity"
              ? "border-[#0052CC] text-[#0052CC]"
              : "border-transparent text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          <History className="h-3.5 w-3.5" />
          Nhật ký
          {activities.length > 0 && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
              {activities.length}
            </span>
          )}
        </button>
      </div>

      {isReadOnly && (
        <div className="mx-5 mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
          {isTerminalTaskStatus(task.status)
            ? `Công việc ${task.status === TaskStatus.CANCELLED ? "đã hủy" : "đã hoàn thành"} và đang ở chế độ chỉ đọc.`
            : "Bạn chỉ có quyền xem công việc này."}
        </div>
      )}

      {/* Main details content */}
      <div
        role="tabpanel"
        className={[
          "flex-1 overflow-y-auto px-5 py-4.5 space-y-5.5",
          activeTab === "details" ? "block" : "hidden",
        ].join(" ")}
      >
        {/* Title Edit */}
        <div>
          {isEditingTitle && !isReadOnly ? (
            <div className="space-y-1.5">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="w-full rounded border border-[#0052CC] bg-white px-2.5 py-1.5 text-base font-semibold text-[#172B4D] outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
              />
              <div className="flex gap-1.5">
                <button
                  onClick={handleTitleSave}
                  className="inline-flex items-center justify-center p-1 rounded bg-[#0052CC] hover:bg-[#0747A6] text-white"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setTempTitle(task.title);
                    setIsEditingTitle(false);
                  }}
                  className="inline-flex items-center justify-center p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <h1
              onClick={isReadOnly ? undefined : () => setIsEditingTitle(true)}
              className={`text-base font-semibold text-[#172B4D] p-1 -ml-1 rounded transition break-words leading-snug ${isReadOnly ? "cursor-default" : "cursor-pointer hover:bg-slate-100"}`}
            >
              {task.title}
            </h1>
          )}
        </div>

        {/* Action bar: Status, code, etc. */}
        <div
          className="flex flex-wrap items-center gap-2 select-none"
          ref={statusDropdownRef}
        >
          {/* Status button */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              disabled={isReadOnly}
              className={[
                "flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold transition border border-transparent shadow-sm",
                currentStatusOpt.color,
              ].join(" ")}
            >
              <span>{currentStatusOpt.label}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showStatusDropdown && !isReadOnly && (
              <div className="absolute left-0 mt-1 w-40 rounded border border-slate-200 bg-white py-1 shadow-lg z-20">
                    {TASK_DRAWER_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => void handleStatusChange(opt.value)}
                    className={[
                      "flex w-full items-center px-3 py-1.5 text-left text-xs font-bold transition hover:bg-slate-100",
                      opt.value === task.status
                        ? "text-[#0052CC] bg-blue-50/30"
                        : "text-slate-700",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLabelDropdown((value) => !value)}
              disabled={isReadOnly}
              className="inline-flex items-center gap-1.5 rounded border border-dashed border-slate-300 px-2 py-1 text-xs font-semibold text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-default disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-500"
              title="Gắn nhãn"
            >
              <Tag className="h-3.5 w-3.5" />
              {task.labels.length > 0
                ? `${task.labels.length} nhãn`
                : "Gắn nhãn"}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showLabelDropdown && !isReadOnly && (
              <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded border border-slate-200 bg-white p-1.5 shadow-lg">
                {labels.length === 0 ? (
                  <p className="px-2 py-2 text-[11px] text-slate-400">
                    Project chưa có nhãn.
                  </p>
                ) : (
                  labels.map((label) => {
                    const attached = task.labels.some(
                      (item) => item.id === label.id,
                    );
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => void handleToggleLabel(label)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                      >
                        <span
                          className={`grid h-3.5 w-3.5 place-items-center rounded border ${attached ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}
                        >
                          {attached && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <LabelBadge name={label.name} color={label.color} />
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {task.labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {task.labels.map((label) => (
                <LabelBadge
                  key={label.id}
                  name={label.name}
                  color={label.color}
                />
              ))}
            </div>
          )}

          {onCreateDependency && !isReadOnly && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDependencyDropdown((value) => !value)}
                className="inline-flex items-center gap-1.5 rounded border border-dashed border-slate-300 px-2 py-1 text-xs font-semibold text-slate-500 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Link2 className="h-3.5 w-3.5" /> Dependency (
                {taskDependencies.length})
              </button>
              {showDependencyDropdown && (
                <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded border border-slate-200 bg-white p-1.5 shadow-lg">
                  {dependencyCandidates.length === 0 ? (
                    <p className="px-2 py-2 text-[11px] text-slate-400">
                      Không còn task để liên kết.
                    </p>
                  ) : (
                    dependencyCandidates.slice(0, 20).map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => void handleAddDependency(candidate.id)}
                        className="block w-full truncate rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                      >
                        ← {candidate.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {taskDependencies.length > 0 && (
            <div className="flex basis-full flex-wrap gap-1">
              {taskDependencies.map((dependency) => {
                const predecessor = tasks.find(
                  (candidate) => candidate.id === dependency.predecessorTaskId,
                );
                return (
                  <span
                    key={dependency.id}
                    className="inline-flex max-w-full items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700"
                  >
                    ← {predecessor?.title || "Task trước"}
                    {onDeleteDependency && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          void onDeleteDependency(
                            task.id,
                            dependency.predecessorTaskId,
                          )
                        }
                        className="ml-1 font-black hover:text-red-600"
                        aria-label="Xóa dependency"
                      >
                        ×
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Description Section */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Mô tả
          </h3>
          {isEditingDesc && !isReadOnly ? (
            <div className="space-y-2">
              <textarea
                value={tempDesc}
                onChange={(e) => setTempDesc(e.target.value)}
                rows={4}
                placeholder="Mô tả mục tiêu, tiêu chí nghiệm thu..."
                className="w-full rounded border border-[#0052CC] p-2.5 text-xs text-[#172B4D] outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDescSave}
                  className="rounded bg-[#0052CC] hover:bg-[#0747A6] px-2.5 py-1 text-xs font-semibold text-white transition"
                >
                  Lưu
                </button>
                <button
                  onClick={() => {
                    setTempDesc(task.description || "");
                    setIsEditingDesc(false);
                  }}
                  className="rounded bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={isReadOnly ? undefined : () => setIsEditingDesc(true)}
              className={[
                "min-h-[60px] p-2.5 rounded border border-transparent bg-slate-50/50 text-xs transition leading-relaxed text-[#42526E] break-words",
                isReadOnly ? "cursor-default" : "cursor-pointer hover:border-slate-300",
                !task.description && "text-slate-400 font-medium italic",
              ].join(" ")}
            >
              {task.description || "Thêm mô tả..."}
            </div>
          )}
        </div>

        {/* Subtasks Section */}
        <div className="space-y-1.5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <ListTree className="h-3.5 w-3.5" />
              <span>Subtasks</span>
            </h3>
            {onCreateSubtask && !task.parentTaskId && !isReadOnly && (
              <button
                type="button"
                onClick={() => onCreateSubtask(task)}
                className="grid h-6 w-6 place-items-center rounded hover:bg-slate-100 text-slate-500"
                title="Thêm subtask"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          {parentTask && (
            <div className="rounded bg-slate-50 px-2.5 py-1.5 border border-slate-200 mb-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase text-[9px]">
                Cha:
              </span>
              <button
                type="button"
                onClick={() => onTaskClick?.(parentTask)}
                className="text-right font-bold text-[#0052CC] hover:underline truncate max-w-[200px]"
              >
                {parentTask.title}
              </button>
            </div>
          )}

          {childTasks.length > 0 ? (
            <div className="space-y-1">
              {childTasks.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onTaskClick?.(child)}
                  className="flex w-full items-center justify-between rounded border border-slate-200 px-2.5 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-355 transition text-left text-xs"
                >
                  <span className="min-w-0 truncate pr-2 text-slate-700 font-medium">
                    {child.title}
                  </span>
                  <TaskStatusBadge status={child.status} compact />
                </button>
              ))}
            </div>
          ) : (
            !task.parentTaskId && (
              <div className="text-[11px] text-slate-400 font-semibold bg-slate-50/30 rounded border border-dashed border-slate-200 py-4 text-center">
                Không có subtask.
              </div>
            )
          )}
        </div>

        <TaskChecklistSection
          task={task}
          isReadOnly={isReadOnly}
          onCreate={onCreateChecklist}
          onUpdate={onUpdateChecklist}
          onDelete={onDeleteChecklist}
        />

        {/* Details Accordion / Grid Panel */}
        <div className="border border-slate-200 rounded bg-white shadow-sm overflow-hidden select-none">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-700 uppercase tracking-wide">
            Chi tiết (Details)
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {/* Assignee */}
            <div
              className="px-3 py-2.5 flex flex-col gap-1"
              ref={assigneeDropdownRef}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Người thực hiện
              </span>
              <div className="relative">
                <div
                  onClick={isReadOnly ? undefined : () => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  className={`flex items-center justify-between p-1 rounded -ml-1 transition ${isReadOnly ? "cursor-default" : "cursor-pointer hover:bg-slate-50"}`}
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
                        <div className="h-5 w-5 rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          ?
                        </div>
                        <span className="text-slate-400 italic font-medium">
                          Chưa gán
                        </span>
                      </>
                    )}
                  </div>
                  {!isReadOnly && <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                </div>

                {showAssigneeDropdown && !isReadOnly && (
                  <div className="absolute left-0 mt-1 w-full max-h-48 overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-lg z-20">
                    <button
                      onClick={handleUnassign}
                      className="flex w-full items-center px-3 py-1.5 text-left text-xs font-semibold text-slate-500 hover:bg-slate-100 italic"
                    >
                      Hủy giao việc
                    </button>
                    {members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => void handleAssigneeChange(member.userId)}
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
              className="px-3 py-2.5 flex flex-col gap-1"
              ref={priorityDropdownRef}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Độ ưu tiên
              </span>
              <div className="relative">
                <div
                  onClick={isReadOnly ? undefined : () => setShowPriorityDropdown(!showPriorityDropdown)}
                  className={`flex items-center justify-between p-1 rounded -ml-1 transition ${isReadOnly ? "cursor-default" : "cursor-pointer hover:bg-slate-50"}`}
                >
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(task.priority)}
                    <span className="font-semibold text-slate-700 capitalize">
                      {task.priority.toLowerCase()}
                    </span>
                  </div>
                  {!isReadOnly && <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                </div>

                {showPriorityDropdown && !isReadOnly && (
                  <div className="absolute left-0 mt-1 w-full rounded border border-slate-200 bg-white py-1 shadow-lg z-20">
                      {TASK_DRAWER_PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => void handlePriorityChange(opt.value)}
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
            <div className="px-3 py-2.5 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ngày bắt đầu
              </span>
              <input
                type="date"
                value={task.startDate ? task.startDate.slice(0, 10) : ""}
                onChange={(e) => void handleStartDateChange(e.target.value)}
                disabled={isReadOnly}
                className="w-full text-xs font-semibold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer p-0 disabled:cursor-default"
              />
            </div>

            {/* Due Date */}
            <div className="px-3 py-2.5 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Hạn hoàn thành
              </span>
              <input
                type="date"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={(e) => void handleDueDateChange(e.target.value)}
                disabled={isReadOnly}
                className="w-full text-xs font-semibold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer p-0 disabled:cursor-default"
              />
            </div>

            {/* Estimate */}
            <div className="px-3 py-2.5 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ước tính (Phút)
              </span>
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Ví dụ: 60"
                value={estimateDraft}
                onChange={(e) => setEstimateDraft(e.target.value)}
                onBlur={() => void handleEstimateSave()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                disabled={isReadOnly}
                className="w-full text-xs font-semibold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer p-0 disabled:cursor-default"
              />
            </div>

            {/* Reporter */}
            <div className="px-3 py-2.5 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Người báo cáo
              </span>
              <span className="font-semibold text-slate-600 block mt-0.5">
                {memberDisplayName(task.reporterId)}
              </span>
            </div>

            {/* Timestamps */}
            <div className="px-3 py-2.5 flex flex-col gap-0.5 text-[10px] text-slate-400 font-semibold bg-slate-50/30">
              <div>Tạo: {formatDateTime(task.createdAt)}</div>
              <div>Cập nhật: {formatDateTime(task.updatedAt)}</div>
            </div>
          </div>
        </div>

        <TaskCommentsSection
          key={task.id}
          task={task}
          members={members}
          isReadOnly={isReadOnly}
        />
      </div>

      {activeTab === "activity" && (
        <TaskActivityPanel
          activities={activities}
          tasks={tasks}
          members={members}
          isLoading={isActivitiesLoading}
          isError={isActivitiesError}
          onRefresh={() => void refetchActivities()}
        />
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết công việc ${issueKey}`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-950/35 animate-in fade-in duration-200 motion-reduce:animate-none"
        onClick={onClose}
        aria-label="Đóng chi tiết công việc"
      />

      <div className="relative flex h-dvh w-full flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200 motion-reduce:animate-none sm:w-[560px] sm:max-w-[calc(100vw-3rem)]">
        {PanelContent}
      </div>
    </div>
  );
}
