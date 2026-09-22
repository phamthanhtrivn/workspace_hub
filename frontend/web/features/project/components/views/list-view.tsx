"use client";

import { Fragment, useMemo, useState } from "react";
import { type Task } from "@/features/project/types/project";
import ProjectTaskRow from "../list/project-task-row";
import TaskInlineCreator from "../list/task-inline-creator";

const BACKLOG_GRID_COLUMNS =
  "grid-cols-[minmax(360px,1fr)_120px_110px_72px_72px_96px]";

export default function ListView({
  tasks,
  onTaskClick,
  onAddTaskInline,
  onOpenChat,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
  onAddTaskInline?: (title: string, parentTaskId?: string) => Promise<void>;
  onAddSubtask?: (task: Task) => void;
  onEditGroup?: (task: Task) => void;
  onDeleteGroup?: (task: Task) => void;
  onReorderTasks?: (group: Task, tasks: Task[]) => Promise<void>;
  onOpenChat?: (task: Task) => void;
}) {
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [creatingSubtaskFor, setCreatingSubtaskFor] = useState<string | null>(
    null,
  );

  const activeTasks = useMemo(() => tasks.filter((task) => !task.archived), [
    tasks,
  ]);
  const activeTaskIds = useMemo(
    () => new Set(activeTasks.map((task) => task.id)),
    [activeTasks],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Task[]>();
    activeTasks.forEach((task) => {
      if (!task.parentTaskId || !activeTaskIds.has(task.parentTaskId)) return;
      const children = map.get(task.parentTaskId) || [];
      children.push(task);
      map.set(task.parentTaskId, children);
    });
    return map;
  }, [activeTasks, activeTaskIds]);

  const rootTasks = useMemo(
    () =>
      activeTasks.filter(
        (task) =>
          !task.parentTaskId || !activeTaskIds.has(task.parentTaskId),
      ),
    [activeTasks, activeTaskIds],
  );

  const toggleExpanded = (taskId: string) => {
    setCollapsedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const openSubtaskCreator = (taskId: string) => {
    setCollapsedTaskIds((current) => {
      const next = new Set(current);
      next.delete(taskId);
      return next;
    });
    setCreatingSubtaskFor(taskId);
  };

  return (
    <div className="flex h-full min-h-[520px] select-none flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className={`sticky top-0 z-10 grid min-w-[980px] ${BACKLOG_GRID_COLUMNS} border-b border-slate-200 bg-slate-50/95 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 backdrop-blur`}
        >
          <span>Task</span>
          <span className="text-right">Status</span>
          <span className="text-right">Due</span>
          <span className="text-center">Priority</span>
          <span className="text-center">Assignee</span>
          <span className="text-right">Actions</span>
        </div>

        {rootTasks.length > 0 ? (
          <div className="min-w-[980px]">
            {rootTasks.map((task) => {
              const children = childrenByParent.get(task.id) || [];
              const isExpanded = !collapsedTaskIds.has(task.id);
              const isCreatingSubtask = creatingSubtaskFor === task.id;

              return (
                <Fragment key={task.id}>
                  <ProjectTaskRow
                    task={task}
                    onTaskClick={onTaskClick}
                    onOpenChat={onOpenChat}
                    hasChildren={children.length > 0}
                    isExpanded={isExpanded}
                    canCreateSubtask={Boolean(onAddTaskInline)}
                    isCreatingSubtask={isCreatingSubtask}
                    onToggleExpanded={() => toggleExpanded(task.id)}
                    onStartCreateSubtask={() => openSubtaskCreator(task.id)}
                  />

                  {isExpanded &&
                    children.map((child) => (
                      <ProjectTaskRow
                        key={child.id}
                        task={child}
                        level={1}
                        onTaskClick={onTaskClick}
                        onOpenChat={onOpenChat}
                      />
                    ))}

                  {isCreatingSubtask && onAddTaskInline && (
                    <div
                      className="border-b border-slate-200 bg-slate-50/60 pl-16"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <TaskInlineCreator
                        initialOpen
                        placeholder="Add subtask..."
                        buttonLabel="Create Subtask"
                        onSubmit={(title) => onAddTaskInline(title, task.id)}
                        onCancel={() => setCreatingSubtaskFor(null)}
                        onCreated={() => setCreatingSubtaskFor(null)}
                        className="border-t-0 bg-transparent pr-4"
                      />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[260px] min-w-[980px] items-center justify-center text-xs font-semibold text-slate-400">
            No tasks found in this project.
          </div>
        )}
      </div>

      {onAddTaskInline && (
        <div className="shrink-0 border-t border-slate-200 bg-white">
          <TaskInlineCreator
            placeholder="What needs to be done?"
            buttonLabel="Create Task"
            onSubmit={(title) => onAddTaskInline(title)}
            buttonClassName="border-t-0"
            className="border-t-0"
          />
        </div>
      )}
    </div>
  );
}
