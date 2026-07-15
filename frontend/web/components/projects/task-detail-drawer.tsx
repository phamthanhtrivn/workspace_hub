"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { type Task, TaskStatus, TaskPriority, type ProjectMember } from "@/types/project";
import { useAppSelector } from "@/store/store";
import {
  useCreateTaskComment,
  useDeleteTaskComment,
  useTaskComments,
  useUpdateTaskComment,
} from "@/features/project/hooks/use-comments";
import { TaskStatusBadge, LabelBadge } from "./status-badge";
import { Avatar } from "./avatar-stack";
import { getIssueKey, getIssueTypeDetails, getPriorityIcon } from "./task-card";
import {
  X,
  Pencil,
  Calendar,
  Clock,
  User,
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
} from "lucide-react";

const STATUS_OPTS = [
  { value: TaskStatus.TODO, label: "TO DO", color: "text-[#42526E] bg-[#DFE1E6] hover:bg-[#C1C7D0]" },
  { value: TaskStatus.IN_PROGRESS, label: "IN PROGRESS", color: "text-[#0747A6] bg-[#DEEBFF] hover:bg-[#B3D4FF]" },
  { value: TaskStatus.IN_REVIEW, label: "IN REVIEW", color: "text-[#A54800] bg-[#FFF0B3] hover:bg-[#FFE380]" },
  { value: TaskStatus.DONE, label: "DONE", color: "text-[#006644] bg-[#E3FCEF] hover:bg-[#ABF5D1]" },
];

const PRIORITY_OPTS = [
  { value: TaskPriority.URGENT, label: "Khẩn cấp" },
  { value: TaskPriority.HIGH, label: "Cao" },
  { value: TaskPriority.MEDIUM, label: "Trung bình" },
  { value: TaskPriority.LOW, label: "Thấp" },
];

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
  project,
  onClose,
  onEdit,
  onTaskClick,
  onUpdateTask,
  onCreateSubtask,
  isInline = false, // If true, renders as inline split screen panel. If false, renders as fixed overlay drawer.
}: {
  task: Task | null;
  tasks?: Task[];
  members?: ProjectMember[];
  project?: any;
  onClose: () => void;
  onEdit?: (task: Task) => void;
  onTaskClick?: (task: Task) => void;
  onUpdateTask?: (taskId: string, payload: any) => Promise<void>;
  onCreateSubtask?: (task: Task) => void;
  isInline?: boolean;
}) {
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

  // References
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const { userId: currentUserId } = useAppSelector((state) => state.auth);
  const { data: loadedComments } = useTaskComments(task?.id || "");
  const createCommentMutation = useCreateTaskComment(task?.id || "");
  const updateCommentMutation = useUpdateTaskComment(task?.id || "");
  const deleteCommentMutation = useDeleteTaskComment(task?.id || "");

  // Detect clicks outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset temp inputs when task changes
  useEffect(() => {
    if (task) {
      setTempTitle(task.title);
      setTempDesc(task.description || "");
      setIsEditingTitle(false);
      setIsEditingDesc(false);
    }
  }, [task]);

  if (!task) return null;

  const comments = loadedComments ?? task.comments;
  const childTasks = tasks.filter(
    (candidate) => candidate.parentTaskId === task.id && !candidate.archived,
  );
  const parentTask = task.parentTaskId
    ? tasks.find((candidate) => candidate.id === task.parentTaskId)
    : undefined;

  const issueKey = getIssueKey(task);
  const issueType = getIssueTypeDetails(task);

  const handleTitleSave = async () => {
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
    } catch (e) {
      setTempTitle(task.title);
    }
  };

  const handleDescSave = async () => {
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
    } catch (e) {
      setTempDesc(task.description || "");
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setShowStatusDropdown(false);
    if (newStatus === task.status) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { status: newStatus });
        toast.success("Đã cập nhật trạng thái");
      }
    } catch (e) {}
  };

  const handleAssigneeChange = async (userId: string) => {
    setShowAssigneeDropdown(false);
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { assigneeUserId: userId });
        toast.success("Đã cập nhật người thực hiện");
      }
    } catch (e) {}
  };

  const handleUnassign = async () => {
    setShowAssigneeDropdown(false);
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { assigneeUserId: null, assignees: [] });
        toast.success("Đã hủy giao việc");
      }
    } catch (e) {}
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    setShowPriorityDropdown(false);
    if (priority === task.priority) return;
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { priority });
        toast.success("Đã cập nhật độ ưu tiên");
      }
    } catch (e) {}
  };

  const handleDueDateChange = async (val: string) => {
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { dueDate: val ? `${val}T17:00:00` : null });
        toast.success("Đã cập nhật hạn hoàn thành");
      }
    } catch (e) {}
  };

  const handleEstimateChange = async (val: number) => {
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, { estimatedMinutes: val || 0 });
        toast.success("Đã cập nhật thời gian ước lượng");
      }
    } catch (e) {}
  };

  const handleCreateComment = async () => {
    const content = newComment.trim();
    if (!content || createCommentMutation.isPending) return;

    try {
      await createCommentMutation.mutateAsync({ content });
      setNewComment("");
      toast.success("Đã thêm bình luận");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm bình luận");
    }
  };

  const handleUpdateComment = async () => {
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
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật bình luận");
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này?")) return;

    deleteCommentMutation.mutate(commentId, {
      onSuccess: () => toast.success("Đã xóa bình luận"),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Không thể xóa bình luận"),
    });
  };

  const checklistTotal = task.checklists.length;
  const checklistDone = task.checklists.filter((c) => c.completed).length;
  const checklistProgress = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const currentStatusOpt = STATUS_OPTS.find((opt) => opt.value === task.status) || STATUS_OPTS[0];
  const assignedUser = task.assignees[0];

  // The core UI of the panel (without drawer wrapping container)
  const PanelContent = (
    <div className="flex flex-col h-full bg-white select-none">
      
      {/* ── Panel Header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          {issueType.icon}
          <span className="hover:underline font-semibold uppercase tracking-wide text-slate-700">{issueKey}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onEdit && (
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
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* ── Main Scroll Content (Vertically Stacked sections, no tabs!) ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4.5 space-y-5.5">
        
        {/* Title Edit */}
        <div>
          {isEditingTitle ? (
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
              onClick={() => setIsEditingTitle(true)}
              className="text-base font-semibold text-[#172B4D] cursor-pointer hover:bg-slate-100 p-1 -ml-1 rounded transition break-words leading-snug"
            >
              {task.title}
            </h1>
          )}
        </div>

        {/* Action bar: Status, code, etc. */}
        <div className="flex flex-wrap items-center gap-2 select-none" ref={statusDropdownRef}>
          {/* Status button */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={[
                "flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold transition border border-transparent shadow-sm",
                currentStatusOpt.color,
              ].join(" ")}
            >
              <span>{currentStatusOpt.label}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showStatusDropdown && (
              <div className="absolute left-0 mt-1 w-40 rounded border border-slate-200 bg-white py-1 shadow-lg z-20">
                {STATUS_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => void handleStatusChange(opt.value)}
                    className={[
                      "flex w-full items-center px-3 py-1.5 text-left text-xs font-bold transition hover:bg-slate-100",
                      opt.value === task.status ? "text-[#0052CC] bg-blue-50/30" : "text-slate-700",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description Section */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mô tả</h3>
          {isEditingDesc ? (
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
              onClick={() => setIsEditingDesc(true)}
              className={[
                "min-h-[60px] p-2.5 rounded border border-transparent hover:border-slate-300 bg-slate-50/50 cursor-pointer text-xs transition leading-relaxed text-[#42526E] break-words",
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
            {onCreateSubtask && !task.parentTaskId && (
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
              <span className="text-slate-400 font-bold uppercase text-[9px]">Cha:</span>
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
                  <span className="min-w-0 truncate pr-2 text-slate-700 font-medium">{child.title}</span>
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
            {checklistTotal > 0 && (
              <span className="text-[10px] font-bold text-slate-500">
                {checklistDone}/{checklistTotal} ({checklistProgress}%)
              </span>
            )}
          </div>

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
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50 text-xs border border-transparent select-none"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      readOnly
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#36B37E] accent-[#36B37E]"
                    />
                    <span className={[
                      "font-medium",
                      item.completed ? "text-slate-400 line-through" : "text-slate-700",
                    ].join(" ")}>
                      {item.title}
                    </span>
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
            <div className="px-3 py-2.5 flex flex-col gap-1" ref={assigneeDropdownRef}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Người thực hiện</span>
              <div className="relative">
                <div
                  onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded -ml-1 transition"
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
                        <span className="font-semibold text-slate-700">{assignedUser.displayName}</span>
                      </>
                    ) : (
                      <>
                        <div className="h-5 w-5 rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 font-bold">?</div>
                        <span className="text-slate-400 italic font-medium">Chưa gán</span>
                      </>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>

                {showAssigneeDropdown && (
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
            <div className="px-3 py-2.5 flex flex-col gap-1" ref={priorityDropdownRef}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Độ ưu tiên</span>
              <div className="relative">
                <div
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded -ml-1 transition"
                >
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(task.priority)}
                    <span className="font-semibold text-slate-700 capitalize">{task.priority.toLowerCase()}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>

                {showPriorityDropdown && (
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

            {/* Due Date */}
            <div className="px-3 py-2.5 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hạn hoàn thành</span>
              <input
                type="date"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={(e) => void handleDueDateChange(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer p-0"
              />
            </div>

            {/* Estimate */}
            <div className="px-3 py-2.5 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ước tính (Phút)</span>
              <input
                type="number"
                min={0}
                placeholder="Ví dụ: 60"
                value={task.estimatedMinutes || ""}
                onChange={(e) => void handleEstimateChange(Number(e.target.value))}
                className="w-full text-xs font-semibold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer p-0"
              />
            </div>

            {/* Reporter */}
            <div className="px-3 py-2.5 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Người báo cáo</span>
              <span className="font-semibold text-slate-600 block mt-0.5">
                {members.find((m) => m.userId === task.reporterId)?.displayName || task.reporterId || "Hệ thống"}
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
                      <span className="text-[11px] font-bold text-[#172B4D]">{comment.authorName}</span>
                      <div className="flex items-center gap-1.5 select-none">
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {formatRelative(comment.createdAt)}
                          {comment.edited && " (đã sửa)"}
                        </span>
                        {currentUserId === comment.authorId && (
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

                    {editingCommentId === comment.id ? (
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
                            disabled={!editingComment.trim() || updateCommentMutation.isPending}
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
        </div>

      </div>
    </div>
  );

  // If isInline is true, just render PanelContent inline without fixed backdrop overlay.
  if (isInline) {
    return (
      <div className="relative flex h-full w-full flex-col bg-white">
        {PanelContent}
      </div>
    );
  }

  // Traditional floating overlay drawer for mobile / popup fallback.
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        {PanelContent}
      </div>
    </div>
  );
}
