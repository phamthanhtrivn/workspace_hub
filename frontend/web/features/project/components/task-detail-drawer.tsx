"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  type Task,
  TaskStatus,
  TaskPriority,
  type ProjectMember,
  type TaskChecklist,
  type TaskLabel,
  type TaskActivity,
  type TaskDependency,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import { useAppSelector } from "@/store/store";
import {
  useCreateTaskComment,
  useDeleteTaskComment,
  useTaskComments,
  useUpdateTaskComment,
} from "@/features/project/hooks/use-comments";
import { useTaskActivities } from "@/features/project/hooks/use-tasks";
import type { UpdateTaskPayload } from "@/features/project/api/task.api";
import { TaskStatusBadge, LabelBadge } from "./status-badge";
import { Avatar } from "./avatar-stack";
import { getIssueKey, getIssueTypeDetails, getPriorityIcon } from "./task-card";
import TaskChatButton from "./task-chat-button";
import {
  X,
  Pencil,
  Tag,
  CheckSquare,
  MessageSquare,
  History,
  FileText,
  ArrowRight,
  Send,
  Trash2,
  ListTree,
  Plus,
  ChevronDown,
  Check,
  Link2,
  LockKeyhole,
} from "lucide-react";

const STATUS_OPTS = [
  {
    value: TaskStatus.TODO,
    label: "TO DO",
    color: "text-[#42526E] bg-[#DFE1E6] hover:bg-[#C1C7D0]",
  },
  {
    value: TaskStatus.IN_PROGRESS,
    label: "IN PROGRESS",
    color: "text-[#0747A6] bg-[#DEEBFF] hover:bg-[#B3D4FF]",
  },
  {
    value: TaskStatus.IN_REVIEW,
    label: "IN REVIEW",
    color: "text-[#A54800] bg-[#FFF0B3] hover:bg-[#FFE380]",
  },
  {
    value: TaskStatus.DONE,
    label: "DONE",
    color: "text-[#006644] bg-[#E3FCEF] hover:bg-[#ABF5D1]",
  },
  {
    value: TaskStatus.CANCELLED,
    label: "ĐÃ HỦY",
    color: "text-slate-600 bg-slate-200 hover:bg-slate-300",
  },
];

const PRIORITY_OPTS = [
  { value: TaskPriority.URGENT, label: "Khẩn cấp" },
  { value: TaskPriority.HIGH, label: "Cao" },
  { value: TaskPriority.MEDIUM, label: "Trung bình" },
  { value: TaskPriority.LOW, label: "Thấp" },
];

type TaskDetailTab = "details" | "activity";
type TaskDrawerUpdatePayload = UpdateTaskPayload & {
  assignees?: Task["assignees"];
  assigneeUserId?: string | null;
};

const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  created: "Đã tạo công việc",
  title: "Đã đổi tên công việc",
  description: "Đã cập nhật mô tả",
  priority: "Đã thay đổi độ ưu tiên",
  status: "Đã thay đổi trạng thái",
  startDate: "Đã thay đổi ngày bắt đầu",
  dueDate: "Đã thay đổi hạn hoàn thành",
  estimatedMinutes: "Đã thay đổi thời gian ước tính",
  allDay: "Đã thay đổi chế độ cả ngày",
  archived: "Đã thay đổi trạng thái lưu trữ",
  parentTaskId: "Đã thay đổi task cha",
  assigneeUserId: "Đã thay đổi người thực hiện",
  isParentTask: "Đã thay đổi loại task",
  autoCompleteSprint: "Đã thay đổi tự động hoàn thành sprint",
  rank: "Đã thay đổi thứ tự",
  checklist_created: "Đã thêm mục checklist",
  checklist_completed: "Đã cập nhật mục checklist",
  checklist_deleted: "Đã xóa mục checklist",
  label_attached: "Đã gắn nhãn",
  label_detached: "Đã gỡ nhãn",
  comment_created: "Đã thêm bình luận",
  comment_updated: "Đã chỉnh sửa bình luận",
  comment_deleted: "Đã xóa bình luận",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  IN_REVIEW: "Đang review",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
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
}: {
  task: Task | null;
  tasks?: Task[];
  members?: ProjectMember[];
  project?: unknown;
  onClose: () => void;
  onOpenChat?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onTaskClick?: (task: Task) => void;
  onUpdateTask?: (
    taskId: string,
    payload: TaskDrawerUpdatePayload,
  ) => Promise<void>;
  onCreateSubtask?: (task: Task) => void;
  onCreateChecklist?: (taskId: string, title: string) => Promise<TaskChecklist>;
  onUpdateChecklist?: (
    checklistId: string,
    completed: boolean,
  ) => Promise<TaskChecklist>;
  onDeleteChecklist?: (checklistId: string) => Promise<void>;
  labels?: TaskLabel[];
  onToggleLabel?: (
    taskId: string,
    labelId: string,
    attached: boolean,
  ) => Promise<void>;
  dependencies?: TaskDependency[];
  onCreateDependency?: (
    successorTaskId: string,
    predecessorTaskId: string,
  ) => Promise<void>;
  onDeleteDependency?: (
    successorTaskId: string,
    predecessorTaskId: string,
  ) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<TaskDetailTab>("details");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");

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

  const { userId: currentUserId } = useAppSelector((state) => state.auth);
  const { data: loadedComments } = useTaskComments(task?.id || "");
  const {
    data: activities = [],
    isLoading: isActivitiesLoading,
    isError: isActivitiesError,
    refetch: refetchActivities,
  } = useTaskActivities(task?.id || "");
  const createCommentMutation = useCreateTaskComment(task?.id || "");
  const updateCommentMutation = useUpdateTaskComment(task?.id || "");
  const deleteCommentMutation = useDeleteTaskComment(task?.id || "");
  const [showChecklistInput, setShowChecklistInput] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState("");
  const [estimateDraft, setEstimateDraft] = useState("");
  const isReadOnly = task ? isTerminalTaskStatus(task.status) : false;

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

  const comments = (loadedComments ?? task.comments).map((comment) => {
    const author = members.find((member) => member.userId === comment.authorId);
    if (!author) return comment;
    return {
      ...comment,
      authorName: author.displayName,
      authorAvatar: author.avatarUrl || comment.authorAvatar,
    };
  });
  const childTasks = tasks.filter(
    (candidate) => candidate.parentTaskId === task.id && !candidate.archived,
  );
  const parentTask = task.parentTaskId
    ? tasks.find((candidate) => candidate.id === task.parentTaskId)
    : undefined;

  const issueKey = getIssueKey(task);
  const issueType = getIssueTypeDetails(task);

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

  const handleCreateComment = async () => {
    if (isReadOnly) return;
    const content = newComment.trim();
    if (!content || createCommentMutation.isPending) return;

    try {
      await createCommentMutation.mutateAsync({ content });
      setNewComment("");
      toast.success("Đã thêm bình luận");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể thêm bình luận",
      );
    }
  };

  const handleUpdateComment = async () => {
    if (isReadOnly) return;
    if (!editingCommentId || !editingComment.trim()) return;

    try {
      await updateCommentMutation.mutateAsync({
        commentId: editingCommentId,
        payload: { content: editingComment.trim() },
      });
      setEditingCommentId(null);
      setEditingComment("");
      toast.success("Đã cập nhật bình luận");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật bình luận",
      );
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (isReadOnly) return;
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này?")) return;

    deleteCommentMutation.mutate(commentId, {
      onSuccess: () => toast.success("Đã xóa bình luận"),
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : "Không thể xóa bình luận",
        ),
    });
  };

  const checklistTotal = task.checklists.length;
  const checklistDone = task.checklists.filter((c) => c.completed).length;
  const checklistProgress =
    checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const handleCreateChecklist = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isReadOnly) return;
    const title = checklistTitle.trim();
    if (!title || !onCreateChecklist) return;
    try {
      await onCreateChecklist(task.id, title);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể thêm checklist",
      );
      return;
    }
    setChecklistTitle("");
    setShowChecklistInput(false);
  };

  const handleToggleChecklist = async (item: TaskChecklist) => {
    if (isReadOnly) return;
    if (!onUpdateChecklist) return;
    try {
      await onUpdateChecklist(item.id, !item.completed);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật checklist",
      );
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (isReadOnly) return;
    if (!onDeleteChecklist) return;
    try {
      await onDeleteChecklist(checklistId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa checklist",
      );
    }
  };

  const memberDisplayName = (userId?: string | null) => {
    if (!userId) return "Người dùng";
    const name = members.find((member) => member.userId === userId)?.displayName;
    return name && name !== userId ? name : "Người dùng";
  };

  const activityLabel = (activity: TaskActivity) => {
    const memberName = memberDisplayName(activity.actorId);
    if (memberName !== "Người dùng") return memberName;
    if (activity.actorName && activity.actorName !== activity.actorId) {
      return activity.actorName;
    }
    return activity.actorId ? "Thành viên" : "Hệ thống";
  };

  const formatActivityValue = (
    activity: TaskActivity,
    value?: string | null,
  ): string | null => {
    if (value === undefined || value === null || value === "") return null;

    if (activity.field.startsWith("checklist_")) {
      try {
        const checklist = JSON.parse(value) as {
          title?: string;
          completed?: boolean;
        };
        if (typeof checklist.completed === "boolean") {
          return `${checklist.title || "Checklist"}: ${checklist.completed ? "Đã hoàn thành" : "Chưa hoàn thành"}`;
        }
        return checklist.title || "Checklist";
      } catch {
        return value;
      }
    }

    if (activity.field === "status") return STATUS_LABELS[value] || value;
    if (activity.field === "priority") return PRIORITY_LABELS[value] || value;
    if (activity.field === "assigneeUserId") {
      return memberDisplayName(value);
    }
    if (activity.field === "parentTaskId") {
      return tasks.find((item) => item.id === value)?.title || value;
    }
    if (activity.field === "estimatedMinutes") return `${value} phút`;
    if (["startDate", "dueDate"].includes(activity.field)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("vi-VN");
    }
    if (["allDay", "archived", "isParentTask", "autoCompleteSprint"].includes(activity.field)) {
      return value === "true" ? "Bật" : "Tắt";
    }
    return value;
  };

  const handleTabChange = (tab: TaskDetailTab) => {
    setActiveTab(tab);
    if (tab === "activity") void refetchActivities();
  };

  const currentStatusOpt =
    STATUS_OPTS.find((opt) => opt.value === task.status) || STATUS_OPTS[0];
  const assignedUser = task.assignees[0];

  // The core UI of the panel (without drawer wrapping container)
  const PanelContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* ── Panel Header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          {issueType.icon}
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
          Công việc {task.status === TaskStatus.CANCELLED ? "đã hủy" : "đã hoàn thành"} và đang ở chế độ chỉ đọc.
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
                {STATUS_OPTS.map((opt) => (
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

        {/* Checklist Section */}
        <div className="space-y-1.5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Checklist</span>
            </h3>
            <div className="flex items-center gap-2">
              {checklistTotal > 0 && (
                <span className="text-[10px] font-bold text-slate-500">
                  {checklistDone}/{checklistTotal} ({checklistProgress}%)
                </span>
              )}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setShowChecklistInput((value) => !value)}
                  className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                  title="Thêm checklist"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {showChecklistInput && !isReadOnly && (
            <form
              onSubmit={(event) => void handleCreateChecklist(event)}
              className="mt-2 flex items-center gap-2"
            >
              <input
                autoFocus
                value={checklistTitle}
                onChange={(event) => setChecklistTitle(event.target.value)}
                placeholder="Nhập nội dung checklist..."
                className="min-w-0 flex-1 rounded border border-blue-300 px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={!checklistTitle.trim()}
                className="rounded bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
              >
                Thêm
              </button>
            </form>
          )}

          {checklistTotal > 0 ? (
            <div className="space-y-1">
              <div className="h-1 w-full overflow-hidden rounded bg-slate-100 mb-2">
                <div
                  className="h-full rounded bg-[#36B37E] transition-all duration-300"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
              <div className="space-y-0.5 bg-white">
                {task.checklists.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs border border-transparent select-none ${isReadOnly ? "cursor-default" : "cursor-pointer hover:bg-slate-50"}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => void handleToggleChecklist(item)}
                      disabled={isReadOnly}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#36B37E] accent-[#36B37E]"
                    />
                    <span
                      className={[
                        "font-medium",
                        item.completed
                          ? "text-slate-400 line-through"
                          : "text-slate-700",
                      ].join(" ")}
                    >
                      {item.title}
                    </span>
                    {onDeleteChecklist && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteChecklist(item.id)}
                        className="ml-auto rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                        title="Xóa checklist"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 font-semibold bg-slate-50/30 rounded border border-dashed border-slate-200 py-4 text-center">
              Không có checklist.
            </div>
          )}
        </div>

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
                    {PRIORITY_OPTS.map((opt) => (
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

        {/* Comments section at the very bottom */}
        <div className="space-y-4 border-t border-slate-100 pt-4 pb-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 select-none">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Bình luận ({comments.length})</span>
          </h3>

          {/* List of comments */}
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  <Avatar
                    user={{
                      userId: comment.authorId,
                      displayName: comment.authorName,
                      avatarUrl: comment.authorAvatar,
                    }}
                    size="sm"
                  />
                  <div className="flex-1 bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded border border-slate-150 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#172B4D]">
                        {comment.authorName}
                      </span>
                      <div className="flex items-center gap-1.5 select-none">
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {formatRelative(comment.createdAt)}
                          {comment.edited && " (đã sửa)"}
                        </span>
                        {currentUserId === comment.authorId && !isReadOnly && (
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingComment(comment.content);
                              }}
                              className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {editingCommentId === comment.id && !isReadOnly ? (
                      <div className="mt-1.5 space-y-1.5">
                        <textarea
                          value={editingComment}
                          onChange={(e) => setEditingComment(e.target.value)}
                          rows={2}
                          className="w-full resize-none rounded border border-[#0052CC] p-2 text-xs text-slate-700 outline-none"
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="rounded px-2 py-0.5 text-[9px] font-bold text-slate-500 hover:bg-slate-200 transition"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleUpdateComment()}
                            disabled={
                              !editingComment.trim() ||
                              updateCommentMutation.isPending
                            }
                            className="rounded bg-[#0052CC] px-2 py-0.5 text-[9px] font-bold text-white disabled:opacity-50 transition"
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs leading-relaxed text-[#42526E] break-words">
                        {comment.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 font-semibold bg-slate-50/30 rounded border border-dashed border-slate-200 py-6 text-center select-none">
              Chưa có bình luận.
            </div>
          )}

          {/* Add comment field */}
          {!isReadOnly && (
            <div className="flex gap-2.5 pt-2 border-t border-slate-100">
              <Avatar
              user={{ userId: currentUserId || "u-curr", displayName: "Me" }}
              size="sm"
            />
            <div className="relative flex-1">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết phản hồi..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateComment();
                }}
                className="w-full rounded border border-slate-300 bg-white py-2 pl-3 pr-9 text-xs font-semibold text-[#172B4D] outline-none transition placeholder:text-slate-400 focus:border-[#0052CC]"
              />
              <button
                type="button"
                onClick={() => void handleCreateComment()}
                disabled={!newComment.trim() || createCommentMutation.isPending}
                className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-[#0052CC] hover:bg-slate-100 transition"
              >
                <Send className="h-3 w-3" strokeWidth={2.5} />
              </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeTab === "activity" && (
        <div
          role="tabpanel"
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#172B4D]">
                Nhật ký hoạt động
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Các thay đổi mới nhất của công việc này.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refetchActivities()}
              className="shrink-0 rounded px-2 py-1 text-[10px] font-bold text-[#0052CC] hover:bg-blue-50"
            >
              Làm mới
            </button>
          </div>

          {isActivitiesLoading ? (
            <div className="space-y-3" aria-label="Đang tải nhật ký">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex animate-pulse gap-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                    <div className="h-3 w-1/3 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : isActivitiesError ? (
            <div className="rounded border border-red-100 bg-red-50 px-4 py-5 text-center">
              <p className="text-xs font-semibold text-red-700">
                Không thể tải nhật ký hoạt động.
              </p>
              <button
                type="button"
                onClick={() => void refetchActivities()}
                className="mt-2 text-[11px] font-bold text-red-700 underline"
              >
                Thử lại
              </button>
            </div>
          ) : activities.length === 0 ? (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
              <History className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Chưa có hoạt động nào được ghi nhận.
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {activities.map((activity, index) => {
                const oldValue = formatActivityValue(
                  activity,
                  activity.oldValue,
                );
                const newValue = formatActivityValue(
                  activity,
                  activity.newValue,
                );

                return (
                  <article
                    key={activity.id}
                    className="relative flex gap-3 pb-5"
                  >
                    {index < activities.length - 1 && (
                      <span className="absolute bottom-0 left-3.5 top-7 w-px bg-slate-200" />
                    )}
                    <span className="relative z-[1] grid h-7 w-7 shrink-0 place-items-center rounded-full border border-blue-100 bg-blue-50 text-[#0052CC]">
                      <History className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs leading-5 text-slate-700">
                          <strong className="font-bold text-[#172B4D]">
                            {activityLabel(activity)}
                          </strong>{" "}
                          {ACTIVITY_ACTION_LABELS[activity.field] ||
                            `Đã thay đổi ${activity.field}`}
                        </p>
                        <time
                          dateTime={activity.createdAt}
                          title={formatDateTime(activity.createdAt)}
                          className="shrink-0 pt-0.5 text-[9px] font-semibold text-slate-400"
                        >
                          {formatRelative(activity.createdAt)}
                        </time>
                      </div>

                      {(oldValue || newValue) && (
                        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-slate-500">
                          {oldValue && (
                            <span className="min-w-0 break-words rounded bg-slate-100 px-1.5 py-1">
                              {oldValue}
                            </span>
                          )}
                          {oldValue && newValue && (
                            <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />
                          )}
                          {newValue && (
                            <span className="min-w-0 break-words rounded bg-blue-50 px-1.5 py-1 text-blue-700">
                              {newValue}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
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
