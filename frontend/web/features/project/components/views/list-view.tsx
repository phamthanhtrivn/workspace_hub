"use client";

import { useMemo } from "react";
import {
  type Task,
} from "@/features/project/types/project";
import ProjectTaskRow from "../list/project-task-row";
import TaskInlineCreator from "../list/task-inline-creator";

export default function ListView({
  tasks,
  onTaskClick,
  onAddTaskInline,
  onAddSubtask,
  onOpenChat,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
  onAddTaskInline?: (
    title: string,
    parentTaskId?: string,
  ) => Promise<void>;
  onAddSubtask?: (task: Task) => void;
  onEditGroup?: (task: Task) => void;
  onDeleteGroup?: (task: Task) => void;
  onReorderTasks?: (group: Task, tasks: Task[]) => Promise<void>;
  onOpenChat?: (task: Task) => void;
}) {
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

  return (
    <div className="space-y-5 select-none pb-8">
      <div className="space-y-3">
        {rootTasks.length > 0 ? (
          rootTasks.map((task) => {
            const children = childrenByParent.get(task.id) || [];
            return (
              <div
                key={task.id}
                className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm"
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
                    placeholder="Add subtask..."
                    buttonLabel="Create Subtask"
                    onSubmit={(title) => onAddTaskInline(title, task.id)}
                  />
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-md border-2 border-dashed border-[#DFE1E6] bg-[#FAFBFC] py-8 text-center text-xs font-semibold text-slate-400">
            No tasks found in this project.
          </div>
        )}
      </div>

      {onAddTaskInline && (
        <div className="pt-2">
          <TaskInlineCreator
            placeholder="What needs to be done?"
            buttonLabel="Create Task"
            onSubmit={(title) => onAddTaskInline(title)}
          />
        </div>
      )}
    </div>
  );
}
