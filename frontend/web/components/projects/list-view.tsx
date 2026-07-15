"use client";

import { useState, type KeyboardEvent } from "react";
import { type Task, TaskStatus } from "@/types/project";
import { TaskStatusBadge, LabelBadge } from "./status-badge";
import { Avatar } from "./avatar-stack";
import { getIssueKey, getIssueTypeDetails, getPriorityIcon } from "./task-card";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ListPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  CheckSquare2,
  Trash2,
  ListOrdered,
} from "lucide-react";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
  });
}

function formatSprintDate(iso?: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function formatSprintDateRange(startDate?: string, endDate?: string): string {
  const start = formatSprintDate(startDate);
  const end = formatSprintDate(endDate);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

function isOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === "DONE") return false;
  return new Date(dueDate) < new Date();
}

/**
 * Jira-style Backlog ListView.
 *
 * Data model mapping (using only the existing Task entity with parentTaskId):
 *   - A "Backlog group" (like Jira's Sprint) = a root Task that has children (childCount > 0).
 *   - Work items inside a group = Tasks whose parentTaskId equals the group task's id.
 *   - The default "Backlog" section = all root tasks that do NOT have children (standalone work items).
 *
 * User actions:
 *   - "+ Create" at the bottom of a group → creates a child task under that group (parentTaskId = group.id).
 *   - "+ Create" at the very bottom of the page → creates a new standalone root task in the Backlog section.
 *   - "Tạo Backlog" button → creates a new empty root task that becomes a new collapsible group.
 */
export default function ListView({
  tasks,
  onTaskClick,
  onAddTask,
  onAddTaskInline,
  onAddSubtask,
  onEditGroup,
  onDeleteGroup,
  onReorderTasks,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
  onAddTaskInline?: (
    title: string,
    parentTaskId?: string,
    isParentTask?: boolean,
  ) => Promise<void>;
  onAddSubtask?: (task: Task) => void;
  onEditGroup?: (task: Task) => void;
  onDeleteGroup?: (task: Task) => void;
  onReorderTasks?: (group: Task, tasks: Task[]) => Promise<void>;
}) {
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());
  const [openMenuGroupId, setOpenMenuGroupId] = useState<string | null>(null);
  const [reorderingGroupId, setReorderingGroupId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [localOrders, setLocalOrders] = useState<Record<string, string[]>>({});

  // Inline creation state: which panel's "+ Create" is active
  const [activeInlineCreatorId, setActiveInlineCreatorId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");

  const activeTasks = tasks.filter((t) => !t.archived);
  const activeTaskIds = new Set(activeTasks.map((t) => t.id));

  // Build parent → children map
  const childrenByParent = new Map<string, Task[]>();
  activeTasks.forEach((task) => {
    if (!task.parentTaskId) return;
    const arr = childrenByParent.get(task.parentTaskId) || [];
    arr.push(task);
    childrenByParent.set(task.parentTaskId, arr);
  });

  // Root tasks = tasks without a parent (or whose parent isn't in the current list)
  const rootTasks = activeTasks.filter(
    (t) => !t.parentTaskId || !activeTaskIds.has(t.parentTaskId),
  );

  // A root task is a "group" (like a Jira Sprint) if it has children
  const groupTasks = rootTasks.filter(
    (t) =>
      t.isParentTask ||
      childrenByParent.has(t.id) ||
      (t.childCount && t.childCount > 0),
  );
  const groupTaskIds = new Set(groupTasks.map((t) => t.id));

  // Everything else in rootTasks goes to the default Backlog
  const backlogTasks = rootTasks.filter((t) => !groupTaskIds.has(t.id));

  const orderedChildren = (groupId: string, children: Task[]) => {
    const savedOrder = localOrders[groupId];
    if (!savedOrder) return children;

    const byId = new Map(children.map((task) => [task.id, task]));
    return [
      ...savedOrder.map((id) => byId.get(id)).filter((task): task is Task => Boolean(task)),
      ...children.filter((task) => !savedOrder.includes(task.id)),
    ];
  };

  const togglePanel = (id: string) => {
    setCollapsedPanels((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleInlineSubmit = async (
    parentTaskId?: string,
    isParentTask = false,
  ) => {
    if (!inlineTitle.trim()) return;
    try {
      if (onAddTaskInline) {
        await onAddTaskInline(inlineTitle.trim(), parentTaskId, isParentTask);
      }
      setInlineTitle("");
      // Keep creator open for rapid successive additions
    } catch (_) {}
  };

  // Status breakdown for a list of tasks
  const statusCounts = (list: Task[]) => {
    let todo = 0, progress = 0, done = 0;
    list.forEach((t) => {
      if (t.status === TaskStatus.TODO) todo++;
      else if (t.status === TaskStatus.DONE) done++;
      else progress++;
    });
    return { todo, progress, done };
  };

  // ── Task Row ──
  const renderTaskRow = (
    task: Task,
    reorder?: {
      group: Task;
      enabled: boolean;
      onDrop: (targetTaskId: string) => void;
    },
  ) => {
    const overdue = isOverdue(task.dueDate, task.status);
    const issueKey = getIssueKey(task);
    const issueType = getIssueTypeDetails(task);
    const priorityIcon = getPriorityIcon(task.priority);

    return (
      <div
        key={task.id}
        role="button"
        tabIndex={0}
        draggable={reorder?.enabled}
        onDragStart={() => {
          if (reorder?.enabled) setDraggedTaskId(task.id);
        }}
        onDragEnd={() => setDraggedTaskId(null)}
        onDragOver={(e) => {
          if (reorder?.enabled) e.preventDefault();
        }}
        onDrop={(e) => {
          if (reorder?.enabled) {
            e.preventDefault();
            reorder.onDrop(task.id);
          }
        }}
        onClick={() => onTaskClick?.(task)}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTaskClick?.(task); }
        }}
        className="group flex items-center gap-3 px-4 py-[7px] hover:bg-[#F4F5F7] transition-colors cursor-pointer border-b border-slate-200 bg-white text-left focus-visible:bg-[#DEEBFF] focus-visible:outline-none"
      >
        {/* Type icon */}
        <div className="shrink-0">{issueType.icon}</div>

        {/* Key */}
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide shrink-0 min-w-[70px] hover:text-[#0052CC]">
          {issueKey}
        </span>

        {/* Title + labels */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm text-[#172B4D] group-hover:text-[#0052CC] font-medium truncate">
            {task.title}
          </span>
          {task.labels.length > 0 && (
            <div className="flex gap-1 shrink-0">
              {task.labels.slice(0, 2).map((l) => (
                <LabelBadge key={l.id} name={l.name} color={l.color} />
              ))}
            </div>
          )}
        </div>

        {/* Due date */}
        <div className="shrink-0 w-20 text-right">
          {task.dueDate ? (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1 rounded ${overdue ? "text-[#DE350B] bg-red-50" : "text-slate-500 bg-slate-100"}`}>
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
        </div>

        {/* Status */}
        <div className="shrink-0 w-28 text-right">
          <TaskStatusBadge status={task.status} compact />
        </div>

        {/* Priority */}
        <div className="shrink-0 w-8 flex justify-center">{priorityIcon}</div>

        {/* Assignee */}
        <div className="shrink-0 w-8 flex justify-end">
          {task.assignees.length > 0 ? (
            <Avatar
              user={{
                userId: task.assignees[0].userId,
                displayName: task.assignees[0].displayName,
                avatarUrl: task.assignees[0].avatarUrl,
              }}
              size="xs"
            />
          ) : (
            <span className="h-5 w-5 rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 font-bold">?</span>
          )}
        </div>
      </div>
    );
  };

  // ── Inline Creator ("+ Create" bar) ──
  const renderInlineCreator = (
    parentTaskId?: string,
    isParentTask = false,
  ) => {
    const key = isParentTask
      ? "__new_parent_task__"
      : parentTaskId || "__backlog__";
    const isActive = activeInlineCreatorId === key;

    if (isActive) {
      return (
        <div className="flex items-center gap-3 px-4 py-2 bg-white border-t border-slate-200">
          <CheckSquare2 className="h-4 w-4 text-[#0052CC] fill-[#DEEBFF] shrink-0" />
          <input
            type="text"
            value={inlineTitle}
            onChange={(e) => setInlineTitle(e.target.value)}
            placeholder="Bạn cần làm gì?"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleInlineSubmit(parentTaskId, isParentTask);
              }
              else if (e.key === "Escape") { setActiveInlineCreatorId(null); setInlineTitle(""); }
            }}
            className="flex-1 text-sm text-[#172B4D] outline-none bg-transparent placeholder:text-slate-400 font-medium"
          />
          <button
            type="button"
            onClick={() => void handleInlineSubmit(parentTaskId, isParentTask)}
            disabled={!inlineTitle.trim()}
            className={`rounded px-3 py-1.5 text-xs font-bold transition ${inlineTitle.trim() ? "bg-[#0052CC] text-white hover:bg-[#0747A6]" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
          >
            Tạo
          </button>
          <button
            type="button"
            onClick={() => { setActiveInlineCreatorId(null); setInlineTitle(""); }}
            className="rounded px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
          >
            Hủy
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => { setActiveInlineCreatorId(key); setInlineTitle(""); }}
        className="flex w-full items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-[#F4F5F7] hover:text-[#0052CC] transition text-left border-t border-slate-150 bg-white"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        <span>Create</span>
      </button>
    );
  };

  // ── Status Badge Circles (grey/blue/green) ──
  const StatusCircles = ({ counts }: { counts: { todo: number; progress: number; done: number } }) => (
    <div className="flex items-center gap-1 text-[10px] font-bold ml-3">
      <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-[#DFE1E6] text-[#42526E] px-1.5" title="To Do">{counts.todo}</span>
      <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-[#DEEBFF] text-[#0747A6] px-1.5" title="In Progress">{counts.progress}</span>
      <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-[#E3FCEF] text-[#006644] px-1.5" title="Done">{counts.done}</span>
    </div>
  );

  return (
    <div className="space-y-5 select-none pb-8">

      {/* ════════════════════════════════════════════════════════
          1. GROUP PANELS (Root tasks that have children)
         ════════════════════════════════════════════════════════ */}
      {groupTasks.map((group) => {
        const isCollapsed = collapsedPanels.has(group.id);
        const children = orderedChildren(group.id, childrenByParent.get(group.id) || []);
        const counts = statusCounts(children);
        const isReordering = reorderingGroupId === group.id;
        const sprintDateRange = formatSprintDateRange(group.startDate, group.dueDate);

        const handleDrop = async (targetTaskId: string) => {
          if (!draggedTaskId || draggedTaskId === targetTaskId) return;
          const fromIndex = children.findIndex((task) => task.id === draggedTaskId);
          const toIndex = children.findIndex((task) => task.id === targetTaskId);
          if (fromIndex < 0 || toIndex < 0) return;

          const nextChildren = [...children];
          const [movedTask] = nextChildren.splice(fromIndex, 1);
          nextChildren.splice(toIndex, 0, movedTask);
          setLocalOrders((previous) => ({
            ...previous,
            [group.id]: nextChildren.map((task) => task.id),
          }));
          setDraggedTaskId(null);
          try {
            await onReorderTasks?.(group, nextChildren);
          } catch (_) {
            // The parent handles the error notification. Keep the local order usable.
          }
        };

        return (
          <div key={group.id} className="rounded border border-slate-200 bg-[#FAFBFC] shadow-sm overflow-hidden">
            {/* ── Group Header ── */}
            <div
              onClick={() => togglePanel(group.id)}
              className="relative flex items-center gap-2 bg-[#EBECF0] px-4 py-2 cursor-pointer hover:bg-[#DFE1E6] transition select-none"
            >
              <button type="button" className="grid h-5 w-5 place-items-center text-slate-600 rounded">
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              <span className="text-sm font-bold text-[#172B4D]">{group.title}</span>
              {sprintDateRange && (
                <span className="text-xs text-slate-500 font-medium">
                  {sprintDateRange}
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                ({children.length} work items)
              </span>

              <StatusCircles counts={counts} />

              <div className="relative ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onTaskClick?.(group)}
                  className="rounded px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
                >
                  Complete sprint
                </button>
                <button
                  type="button"
                  aria-label="Sprint actions"
                  aria-expanded={openMenuGroupId === group.id}
                  onClick={() => setOpenMenuGroupId((current) => current === group.id ? null : group.id)}
                  className="grid h-7 w-7 place-items-center rounded text-slate-500 hover:bg-slate-200 transition"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {openMenuGroupId === group.id && (
                  <div className="absolute right-0 top-9 z-30 w-52 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setReorderingGroupId((current) => current === group.id ? null : group.id);
                        setOpenMenuGroupId(null);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <ListOrdered className="h-3.5 w-3.5 text-slate-500" />
                      Reorder work items
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuGroupId(null);
                        onEditGroup?.(group);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      Edit sprint
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuGroupId(null);
                        onDeleteGroup?.(group);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete sprint
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isReordering && (
              <div className="border-b border-blue-100 bg-blue-50 px-4 py-1.5 text-[11px] font-medium text-blue-700">
                Kéo thả các work item để sắp xếp lại, sau đó thả lên vị trí mong muốn.
              </div>
            )}

            {/* ── Children Rows ── */}
            {!isCollapsed && (
              <div className="divide-y divide-slate-100 bg-white">
                {children.length > 0
                  ? children.map((task) =>
                      renderTaskRow(task, {
                        group,
                        enabled: isReordering,
                        onDrop: (targetTaskId) => void handleDrop(targetTaskId),
                      }),
                    )
                  : (
                    <div className="m-3 border-2 border-dashed border-[#DFE1E6] bg-[#FAFBFC] rounded-md py-8 text-center text-xs font-semibold text-slate-400">
                      Your backlog is empty.
                    </div>
                  )
                }
              </div>
            )}

            {/* ── Inline Creator for this group ── */}
            {!isCollapsed && renderInlineCreator(group.id)}
          </div>
        );
      })}

      {/* ════════════════════════════════════════════════════════
          2. DEFAULT BACKLOG (Standalone root tasks without children)
         ════════════════════════════════════════════════════════ */}
      <div className="rounded border border-slate-200 bg-[#FAFBFC] shadow-sm overflow-hidden">
        {/* ── Backlog Header ── */}
        <div
          onClick={() => togglePanel("__backlog__")}
          className="flex items-center gap-2 bg-[#EBECF0] px-4 py-2 cursor-pointer hover:bg-[#DFE1E6] transition select-none"
        >
          <button type="button" className="grid h-5 w-5 place-items-center text-slate-600 rounded">
            {collapsedPanels.has("__backlog__") ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <span className="text-sm font-bold text-[#172B4D]">Backlog</span>
          <span className="text-xs text-slate-500 font-medium">({backlogTasks.length} công việc)</span>

          <StatusCircles counts={statusCounts(backlogTasks)} />

          <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setActiveInlineCreatorId("__new_parent_task__");
                setInlineTitle("");
              }}
              className="rounded px-2.5 py-1 text-xs font-bold bg-[#DFE1E6] hover:bg-[#C1C7D0] text-[#42526E] transition shadow-sm border border-slate-300"
            >
              Create sprint
            </button>
          </div>
        </div>

        {activeInlineCreatorId === "__new_parent_task__" &&
          renderInlineCreator(undefined, true)}

        {/* ── Backlog Rows ── */}
        {!collapsedPanels.has("__backlog__") && (
          <div className="divide-y divide-slate-100 bg-white">
            {backlogTasks.length > 0
              ? backlogTasks.map((task) => renderTaskRow(task))
              : (
                <div className="m-3 border-2 border-dashed border-[#DFE1E6] bg-[#FAFBFC] rounded-md py-8 text-center text-xs font-semibold text-slate-400">
                  Your backlog is empty.
                </div>
              )
            }
          </div>
        )}

        {/* ── Inline Creator for default backlog ── */}
        {!collapsedPanels.has("__backlog__") && renderInlineCreator()}
      </div>

      {/* ════════════════════════════════════════════════════════
          3. BOTTOM "+ Create" — creates a new root group task
         ════════════════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={() => {
          setActiveInlineCreatorId("__backlog__");
          setInlineTitle("");
        }}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#0052CC] transition px-1 py-1"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        <span>Create</span>
      </button>

    </div>
  );
}
