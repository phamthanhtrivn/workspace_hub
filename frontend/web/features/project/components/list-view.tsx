"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import {
  type Task,
  ProjectType,
  TaskStatus,
} from "@/features/project/types/project";
import ProjectTaskRow from "./project-task-row";
import TaskInlineCreator from "./task-inline-creator";
import ListGroupPanel from "./list-group-panel";

function StatusCircles({
  counts,
}: {
  counts: { todo: number; progress: number; done: number };
}) {
  return (
    <div className="ml-3 flex items-center gap-1 text-[10px] font-bold">
      <span
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DFE1E6] px-1.5 text-[#42526E]"
        title="To Do"
      >
        {counts.todo}
      </span>
      <span
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DEEBFF] px-1.5 text-[#0747A6]"
        title="In Progress"
      >
        {counts.progress}
      </span>
      <span
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E3FCEF] px-1.5 text-[#006644]"
        title="Done"
      >
        {counts.done}
      </span>
    </div>
  );
}

export default function ListView({
  tasks,
  projectType = ProjectType.SOFTWARE_DEVELOPMENT,
  onTaskClick,
  onAddTaskInline,
  onAddSubtask,
  onEditGroup,
  onDeleteGroup,
  onReorderTasks,
  onOpenChat,
}: {
  tasks: Task[];
  projectType?: ProjectType;
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
  onOpenChat?: (task: Task) => void;
}) {
  const isGeneralProject = projectType === ProjectType.GENERAL;
  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(
    new Set(),
  );
  const [showCreateSprintBar, setShowCreateSprintBar] = useState(false);

  const activeTasks = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);
  const activeTaskIds = useMemo(
    () => new Set(activeTasks.map((t) => t.id)),
    [activeTasks],
  );

  // Build parent → children map
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Task[]>();
    activeTasks.forEach((task) => {
      if (!task.parentTaskId) return;
      const arr = map.get(task.parentTaskId) || [];
      arr.push(task);
      map.set(task.parentTaskId, arr);
    });
    return map;
  }, [activeTasks]);

  // Root tasks
  const rootTasks = useMemo(
    () =>
      activeTasks.filter(
        (t) => !t.parentTaskId || !activeTaskIds.has(t.parentTaskId),
      ),
    [activeTasks, activeTaskIds],
  );

  // Group tasks
  const groupTasks = useMemo(
    () =>
      rootTasks.filter(
        (t) =>
          t.isParentTask ||
          childrenByParent.has(t.id) ||
          (t.childCount && t.childCount > 0),
      ),
    [childrenByParent, rootTasks],
  );

  const groupTaskIds = useMemo(
    () => new Set(groupTasks.map((t) => t.id)),
    [groupTasks],
  );
  const backlogTasks = useMemo(
    () => rootTasks.filter((t) => !groupTaskIds.has(t.id)),
    [groupTaskIds, rootTasks],
  );

  const togglePanel = (id: string) => {
    setCollapsedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statusCounts = (list: Task[]) => {
    let todo = 0,
      progress = 0,
      done = 0;
    list.forEach((t) => {
      if (t.status === TaskStatus.TODO) todo++;
      else if (
        t.status === TaskStatus.DONE ||
        t.status === TaskStatus.CANCELLED
      )
        done++;
      else progress++;
    });
    return { todo, progress, done };
  };

  return (
    <div className="space-y-5 select-none pb-8">
      {/* ── 1. GROUP PANELS (Root tasks that have children) ── */}
      {!isGeneralProject &&
        groupTasks.map((group) => (
          <ListGroupPanel
            key={group.id}
            group={group}
            childrenTasks={childrenByParent.get(group.id) || []}
            isGeneralProject={isGeneralProject}
            onTaskClick={onTaskClick}
            onOpenChat={onOpenChat}
            onEditGroup={onEditGroup}
            onDeleteGroup={onDeleteGroup}
            onReorderTasks={onReorderTasks}
            onAddTaskInline={
              onAddTaskInline
                ? (title) => onAddTaskInline(title, group.id)
                : undefined
            }
            onAddSubtask={onAddSubtask}
          />
        ))}

      {/* ── 2. GENERAL PROJECT VIEW (Card list with subtasks) ── */}
      {isGeneralProject && (
        <div className="space-y-3">
          {rootTasks.length > 0 ? (
            rootTasks.map((task) => {
              const children = childrenByParent.get(task.id) || [];
              return (
                <div
                  key={task.id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <ProjectTaskRow
                    task={task}
                    onTaskClick={onTaskClick}
                    onOpenChat={onOpenChat}
                    onAddSubtask={
                      onAddSubtask ? () => onAddSubtask(task) : undefined
                    }
                  />

                  {children.length > 0 && (
                    <div className="ml-8 border-l-2 border-slate-200 bg-slate-50/40">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="border-b border-slate-100 pl-4 last:border-b-0"
                        >
                          <ProjectTaskRow
                            task={child}
                            onTaskClick={onTaskClick}
                            onOpenChat={onOpenChat}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {onAddTaskInline && (
                    <TaskInlineCreator
                      placeholder="Nhập tên subtask..."
                      buttonLabel="Tạo subtask"
                      onSubmit={(title) => onAddTaskInline(title, task.id)}
                    />
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-md border-2 border-dashed border-[#DFE1E6] bg-[#FAFBFC] py-8 text-center text-xs font-semibold text-slate-400">
              Chưa có công việc.
            </div>
          )}
        </div>
      )}

      {/* ── 3. DEFAULT BACKLOG PANEL (Software project) ── */}
      {!isGeneralProject && (
        <div className="overflow-hidden rounded border border-slate-200 bg-[#FAFBFC] shadow-sm">
          {/* Backlog Header */}
          <div
            onClick={() => togglePanel("__backlog__")}
            className="flex cursor-pointer select-none items-center gap-2 bg-[#EBECF0] px-4 py-2 transition hover:bg-[#DFE1E6]"
          >
            <button
              type="button"
              className="grid h-5 w-5 place-items-center rounded text-slate-600"
            >
              {collapsedPanels.has("__backlog__") ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            <span className="text-sm font-bold text-[#172B4D]">Backlog</span>
            <span className="text-xs font-medium text-slate-500">
              ({backlogTasks.length} công việc)
            </span>

            <StatusCircles counts={statusCounts(backlogTasks)} />

            <div
              className="ml-auto flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowCreateSprintBar(true)}
                className="rounded border border-slate-300 bg-[#DFE1E6] px-2.5 py-1 text-xs font-bold text-[#42526E] shadow-sm transition hover:bg-[#C1C7D0]"
              >
                Create sprint
              </button>
            </div>
          </div>

          {showCreateSprintBar && onAddTaskInline && (
            <TaskInlineCreator
              placeholder="Nhập tên Sprint mới..."
              buttonLabel="Create sprint"
              onSubmit={async (title) => {
                await onAddTaskInline(title, undefined, true);
                setShowCreateSprintBar(false);
              }}
            />
          )}

          {/* Backlog Rows */}
          {!collapsedPanels.has("__backlog__") && (
            <div className="divide-y divide-slate-100 bg-white">
              {backlogTasks.length > 0 ? (
                backlogTasks.map((task) => (
                  <ProjectTaskRow
                    key={task.id}
                    task={task}
                    onTaskClick={onTaskClick}
                    onOpenChat={onOpenChat}
                  />
                ))
              ) : (
                <div className="m-3 rounded-md border-2 border-dashed border-[#DFE1E6] bg-[#FAFBFC] py-8 text-center text-xs font-semibold text-slate-400">
                  Your backlog is empty.
                </div>
              )}
            </div>
          )}

          {/* Inline Creator for default backlog */}
          {!collapsedPanels.has("__backlog__") && onAddTaskInline && (
            <TaskInlineCreator
              placeholder="Bạn cần làm gì?"
              buttonLabel="Create"
              onSubmit={(title) => onAddTaskInline(title)}
            />
          )}
        </div>
      )}

      {/* ── 4. BOTTOM CREATE BUTTON (General project) ── */}
      {isGeneralProject && onAddTaskInline && (
        <div className="pt-2">
          <TaskInlineCreator
            placeholder="Nhập tên công việc mới..."
            buttonLabel="Tạo công việc"
            onSubmit={(title) => onAddTaskInline(title, undefined, true)}
          />
        </div>
      )}
    </div>
  );
}
