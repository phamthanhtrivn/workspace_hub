"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ListOrdered,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { TaskStatus, type Task } from "@/features/project/types/project";
import ProjectTaskRow from "./project-task-row";
import TaskInlineCreator from "./task-inline-creator";
import { StatusCircles } from "../ui/status-circles";
import { Button } from "@/components/ui/button";

interface ListGroupPanelProps {
  group: Task;
  childrenTasks: Task[];
  isGeneralProject: boolean;
  onTaskClick?: (task: Task) => void;
  onOpenChat?: (task: Task) => void;
  onEditGroup?: (task: Task) => void;
  onDeleteGroup?: (task: Task) => void;
  onReorderTasks?: (group: Task, tasks: Task[]) => Promise<void>;
  onAddTaskInline?: (title: string, parentTaskId?: string) => Promise<void>;
  onAddSubtask?: (task: Task) => void;
}

export default function ListGroupPanel({
  group,
  childrenTasks,
  isGeneralProject,
  onTaskClick,
  onOpenChat,
  onEditGroup,
  onDeleteGroup,
  onReorderTasks,
  onAddTaskInline,
  onAddSubtask,
}: ListGroupPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const orderedTasks = (() => {
    if (!localOrder) return childrenTasks;
    const byId = new Map(childrenTasks.map((task) => [task.id, task]));
    return [
      ...localOrder
        .map((id) => byId.get(id))
        .filter((task): task is Task => Boolean(task)),
      ...childrenTasks.filter((task) => !localOrder.includes(task.id)),
    ];
  })();

  const counts = (() => {
    let todo = 0,
      progress = 0,
      done = 0;
    childrenTasks.forEach((t) => {
      if (t.status === TaskStatus.TODO) todo++;
      else if (
        t.status === TaskStatus.DONE ||
        t.status === TaskStatus.CANCELLED
      )
        done++;
      else progress++;
    });
    return { todo, progress, done };
  })();

  const formatSprintDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
        })
      : "";
  const startDate = formatSprintDate(group.startDate);
  const endDate = formatSprintDate(group.dueDate);
  const sprintDateRange =
    startDate && endDate ? `${startDate} – ${endDate}` : startDate || endDate;

  const handleDrop = async (targetTaskId: string) => {
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;
    const fromIndex = orderedTasks.findIndex(
      (task) => task.id === draggedTaskId,
    );
    const toIndex = orderedTasks.findIndex((task) => task.id === targetTaskId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextChildren = [...orderedTasks];
    const [movedTask] = nextChildren.splice(fromIndex, 1);
    nextChildren.splice(toIndex, 0, movedTask);
    setLocalOrder(nextChildren.map((task) => task.id));
    setDraggedTaskId(null);

    try {
      await onReorderTasks?.(group, nextChildren);
    } catch {
      // Keep local order usable if parent error handler logs toast
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#FAFBFC] shadow-2xs">
      {/* ── Group Header ── */}
      <div
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="relative flex cursor-pointer select-none items-center gap-2 bg-[#EBECF0] px-4 py-2.5 transition hover:bg-[#DFE1E6]"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded text-slate-600 cursor-pointer p-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        <span className="text-sm font-bold text-[#172B4D]">{group.title}</span>
        {sprintDateRange && (
          <span className="text-xs font-medium text-slate-500">
            {sprintDateRange}
          </span>
        )}
        <span className="text-xs font-medium text-slate-500">
          ({childrenTasks.length} {isGeneralProject ? "subtasks" : "tasks"})
        </span>

        <StatusCircles counts={counts} />

        {!isGeneralProject && (
          <div
            className="relative ml-auto flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onTaskClick?.(group)}
              className="h-7 cursor-pointer rounded-lg border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              Complete Sprint
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Sprint actions"
              aria-expanded={openMenu}
              onClick={() => setOpenMenu((prev) => !prev)}
              className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {openMenu && (
              <div className="absolute right-0 top-9 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsReordering((prev) => !prev);
                    setOpenMenu(false);
                  }}
                  className="flex w-full h-auto justify-start rounded-none cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <ListOrdered className="h-3.5 w-3.5 text-slate-500" />
                  Reorder Tasks
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpenMenu(false);
                    onEditGroup?.(group);
                  }}
                  className="flex w-full h-auto justify-start rounded-none cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                  Edit Sprint
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpenMenu(false);
                    onDeleteGroup?.(group);
                  }}
                  className="flex w-full h-auto justify-start rounded-none cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Sprint
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {isReordering && (
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-1.5 text-[11px] font-medium text-blue-700">
          Drag and drop tasks to change their execution order.
        </div>
      )}

      {/* ── Group Body ── */}
      {!isCollapsed && (
        <div>
          {orderedTasks.length === 0 ? (
            <div className="border-b border-slate-200 bg-white px-4 py-8 text-center text-xs font-semibold text-slate-400">
              {isGeneralProject ? "No subtasks in this section." : "No tasks in this sprint."}
            </div>
          ) : (
            orderedTasks.map((child) => (
              <ProjectTaskRow
                key={child.id}
                task={child}
                reorderEnabled={isReordering}
                onDragStart={(id) => setDraggedTaskId(id)}
                onDragEnd={() => setDraggedTaskId(null)}
                onDrop={handleDrop}
                onTaskClick={onTaskClick}
                onOpenChat={onOpenChat}
                onAddSubtask={
                  onAddSubtask ? () => onAddSubtask(child) : undefined
                }
              />
            ))
          )}

          {onAddTaskInline && (
            <TaskInlineCreator
              placeholder={
                isGeneralProject
                  ? "Add subtask..."
                  : "What needs to be done in this sprint?"
              }
              buttonLabel={isGeneralProject ? "Create Subtask" : "Create Task"}
              onSubmit={(title) => onAddTaskInline(title, group.id)}
            />
          )}
        </div>
      )}
    </div>
  );
}
