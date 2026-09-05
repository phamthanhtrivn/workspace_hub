"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type TaskLabel,
  TaskPriority,
  TaskStatus,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import { useTaskActivities } from "@/features/project/hooks/use-tasks";
import type { TaskDetailDrawerProps } from "../types/task-detail-drawer.types";
import { getIssueKey, getIssueTypeDetails } from "./task-card";
import TaskChatButton from "./task-chat-button";
import { createTaskActivityPresenter } from "@/features/project/task-activity-presenter";
import TaskActivityPanel from "./task-activity-panel";
import TaskChecklistSection from "./task-checklist-section";
import TaskCommentsSection from "./task-comments-section";
import TaskStatusPicker from "./task-status-picker";
import TaskLabelsPicker from "./task-labels-picker";
import TaskDependenciesSection from "./task-dependencies-section";
import TaskSubtasksSection from "./task-subtasks-section";
import TaskPropertiesPanel from "./task-properties-panel";
import { toApiDateTime } from "../utils/task-dates";
import { FileText, History, LockKeyhole, Pencil, X } from "lucide-react";

type TaskDetailTab = "details" | "activity";

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

  const {
    data: activities = [],
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
    refetch: refetchActivities,
  } = useTaskActivities(task?.id || "");

  const isReadOnly = task
    ? isTerminalTaskStatus(task.status) || !canEditTask
    : true;

  // Reset temp inputs when task changes
  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Draft fields must reset when the selected task changes.
      setTempTitle(task.title);
      setTempDesc(task.description || "");
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
    if (isReadOnly || newStatus === task.status) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { status: newStatus });
        toast.success("Đã cập nhật trạng thái");
      }
    } catch {}
  };

  const handleAssigneeChange = async (userId: string | null) => {
    if (isReadOnly) return;
    try {
      if (onUpdateTask) {
        if (userId) {
          await onUpdateTask(task.id, { assigneeUserId: userId });
        } else {
          await onUpdateTask(task.id, { assigneeUserId: null, assignees: [] });
        }
        toast.success(
          userId ? "Đã cập nhật người thực hiện" : "Đã hủy giao việc",
        );
      }
    } catch {}
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    if (isReadOnly || priority === task.priority) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { priority });
        toast.success("Đã cập nhật độ ưu tiên");
      }
    } catch {}
  };

  const handleToggleLabel = async (label: TaskLabel) => {
    if (isReadOnly || !onToggleLabel) return;
    const attached = task.labels.some((item) => item.id === label.id);
    try {
      await onToggleLabel(task.id, label.id, attached);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật nhãn",
      );
    }
  };

  const handleAddDependency = async (predecessorTaskId: string) => {
    if (isReadOnly || !onCreateDependency) return;
    try {
      await onCreateDependency(task.id, predecessorTaskId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo dependency",
      );
    }
  };

  const handleDeleteDependency = async (predecessorTaskId: string) => {
    if (isReadOnly || !onDeleteDependency) return;
    try {
      await onDeleteDependency(task.id, predecessorTaskId);
      toast.success("Đã gỡ dependency");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể gỡ dependency",
      );
    }
  };

  const handleDueDateChange = async (val: string) => {
    if (isReadOnly) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, {
          dueDate: toApiDateTime(val ? `${val}T18:00:00` : "", task.allDay),
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
          startDate: toApiDateTime(val ? `${val}T09:00:00` : "", task.allDay),
        });
        toast.success("Đã cập nhật ngày bắt đầu");
      }
    } catch {}
  };

  const handleEstimateSave = async (minutes: number) => {
    if (isReadOnly) return;
    if (onUpdateTask) {
      await onUpdateTask(task.id, { estimatedMinutes: minutes });
      toast.success("Đã cập nhật thời gian ước lượng");
    }
  };

  const handleTabChange = (tab: TaskDetailTab) => {
    setActiveTab(tab);
    if (tab === "activity") void refetchActivities();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200 sm:max-w-2xl">
        {/* ── Panel Header ── */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            {issueType.icon}
            <span className="text-[10px] font-bold uppercase text-slate-400">
              {issueType.label}
            </span>
            <span className="font-semibold uppercase tracking-wide text-slate-700 hover:underline">
              {issueKey}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <TaskChatButton task={task} onOpenChat={onOpenChat} />
            {onEdit && !isReadOnly && (
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="grid h-7 w-7 place-items-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                title="Mở form sửa chi tiết"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              title="Đóng panel chi tiết"
              aria-label="Đóng chi tiết công việc"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* ── Tabs bar ── */}
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

        {/* ── Main details content ── */}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleTitleSave();
                    if (e.key === "Escape") {
                      setTempTitle(task.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="w-full rounded border border-[#0052CC] p-1.5 text-base font-bold text-[#172B4D] outline-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleTitleSave()}
                    className="rounded bg-[#0052CC] hover:bg-[#0747A6] px-2.5 py-1 text-xs font-semibold text-white transition"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => {
                      setTempTitle(task.title);
                      setIsEditingTitle(false);
                    }}
                    className="rounded bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <h2
                onClick={isReadOnly ? undefined : () => setIsEditingTitle(true)}
                className={[
                  "text-lg font-bold text-[#172B4D] transition leading-snug rounded p-1 -ml-1 border border-transparent break-words",
                  isReadOnly
                    ? "cursor-default"
                    : "cursor-pointer hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* Status, Labels & Dependencies Bar */}
          <div className="flex flex-wrap items-center gap-2 select-none">
            <TaskStatusPicker
              status={task.status}
              onChange={handleStatusChange}
              disabled={isReadOnly}
            />

            <TaskLabelsPicker
              taskLabels={task.labels}
              availableLabels={labels}
              onToggleLabel={handleToggleLabel}
              disabled={isReadOnly}
            />

            <TaskDependenciesSection
              taskId={task.id}
              dependencies={dependencies}
              tasks={tasks}
              onCreateDependency={
                onCreateDependency ? handleAddDependency : undefined
              }
              onDeleteDependency={
                onDeleteDependency ? handleDeleteDependency : undefined
              }
              disabled={isReadOnly}
            />
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
                    onClick={() => void handleDescSave()}
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
                  isReadOnly
                    ? "cursor-default"
                    : "cursor-pointer hover:border-slate-300",
                  !task.description && "text-slate-400 font-medium italic",
                ].join(" ")}
              >
                {task.description || "Thêm mô tả..."}
              </div>
            )}
          </div>

          {/* Subtasks Section */}
          <TaskSubtasksSection
            task={task}
            tasks={tasks}
            isReadOnly={isReadOnly}
            onCreateSubtask={onCreateSubtask}
            onTaskClick={onTaskClick}
          />

          {/* Checklist Section */}
          <TaskChecklistSection
            task={task}
            isReadOnly={isReadOnly}
            onCreate={onCreateChecklist}
            onUpdate={onUpdateChecklist}
            onDelete={onDeleteChecklist}
          />

          {/* Details Accordion / Properties Panel */}
          <TaskPropertiesPanel
            task={task}
            members={members}
            isReadOnly={isReadOnly}
            memberDisplayName={memberDisplayName}
            onAssigneeChange={handleAssigneeChange}
            onPriorityChange={handlePriorityChange}
            onStartDateChange={handleStartDateChange}
            onDueDateChange={handleDueDateChange}
            onEstimateSave={handleEstimateSave}
          />

          {/* Comments Section */}
          <TaskCommentsSection
            task={task}
            members={members}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* ── Activity Tab Content ── */}
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
    </div>
  );
}
