"use client";

import { type Task, TaskStatus } from "@/features/project/types/project";
import { getTasksByStatus } from "@/lib/mock-data";
import TaskCard from "./task-card";
import { Plus } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

const COLUMNS: {
  status: TaskStatus;
  labelId: string;
  headerColor: string;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    status: TaskStatus.TODO,
    labelId: "project.task.status.todoUpper",
    headerColor: "text-[#5E6C84]",
    badgeBg: "bg-[#DFE1E6]",
    badgeText: "text-[#42526E]",
  },
  {
    status: TaskStatus.IN_PROGRESS,
    labelId: "project.task.status.inProgressUpper",
    headerColor: "text-[#0052CC]",
    badgeBg: "bg-[#DEEBFF]",
    badgeText: "text-[#0747A6]",
  },
  {
    status: TaskStatus.IN_REVIEW,
    labelId: "project.task.status.inReviewUpper",
    headerColor: "text-[#FF8B00]",
    badgeBg: "bg-[#FFF0B3]",
    badgeText: "text-[#A54800]",
  },
  {
    status: TaskStatus.DONE,
    labelId: "project.task.status.doneUpper",
    headerColor: "text-[#006644]",
    badgeBg: "bg-[#E3FCEF]",
    badgeText: "text-[#006644]",
  },
  {
    status: TaskStatus.CANCELLED,
    labelId: "project.task.status.cancelledUpper",
    headerColor: "text-[#5E6C84]",
    badgeBg: "bg-[#E2E8F0]",
    badgeText: "text-[#475569]",
  },
];

export default function BoardView({
  tasks,
  onTaskClick,
  onTaskMove,
  onAddTask,
  onOpenChat,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask?: (status: TaskStatus) => void;
  onOpenChat?: (task: Task) => void;
}) {
  const intl = useAppIntl();

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 items-start h-full">
      {COLUMNS.map((col) => {
        const columnTasks = getTasksByStatus(tasks, col.status);
        const columnLabel = intl.formatMessage({ id: col.labelId });

        return (
          <div
            key={col.status}
            className="flex flex-col rounded bg-[#F4F5F7] p-2 min-h-[500px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("text/plain");
              if (taskId && onTaskMove) {
                onTaskMove(taskId, col.status);
              }
            }}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-2 pb-2.5 pt-1">
              <div className="flex items-center gap-2">
                <h3
                  className={`text-xs font-bold tracking-wider ${col.headerColor}`}
                >
                  {columnLabel}
                </h3>
                <span
                  className={`inline-flex items-center justify-center h-5 px-1.5 rounded-full text-[10px] font-bold ${col.badgeBg} ${col.badgeText}`}
                >
                  {columnTasks.length}
                </span>
              </div>
              {col.status !== TaskStatus.CANCELLED && <button
                type="button"
                onClick={() => onAddTask?.(col.status)}
                className="grid h-6 w-6 place-items-center rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
                title={intl.formatMessage(
                  { id: "project.task.createInStatus" },
                  { status: columnLabel },
                )}
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
              </button>}
            </div>

            {/* Task cards list */}
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                  onOpenChat={onOpenChat}
                />
              ))}

              {columnTasks.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center rounded border border-dashed border-slate-300 py-10 text-xs font-medium text-slate-400 bg-slate-50/50">
                  <span>{intl.formatMessage({ id: "project.task.empty" })}</span>
                  {onAddTask && col.status !== TaskStatus.CANCELLED && (
                    <button
                      type="button"
                      onClick={() => onAddTask(col.status)}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-[#0052CC] hover:underline"
                    >
                      <Plus className="h-3 w-3" strokeWidth={2.5} />
                      {intl.formatMessage({ id: "project.task.add" })}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Inline quick create button at bottom (if tasks exist) */}
            {columnTasks.length > 0 && onAddTask && col.status !== TaskStatus.CANCELLED && (
              <button
                type="button"
                onClick={() => onAddTask(col.status)}
                className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition text-left px-2"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                <span>{intl.formatMessage({ id: "project.task.create" })}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
