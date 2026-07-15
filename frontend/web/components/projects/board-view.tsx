"use client";

import { type Task, TaskStatus } from "@/types/project";
import { getTasksByStatus } from "@/lib/mock-data";
import TaskCard from "./task-card";
import { Plus, Circle, Loader2, Eye, CheckCircle2 } from "lucide-react";

const COLUMNS: {
  status: TaskStatus;
  label: string;
  headerColor: string;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    status: TaskStatus.TODO,
    label: "TO DO",
    headerColor: "text-[#5E6C84]",
    badgeBg: "bg-[#DFE1E6]",
    badgeText: "text-[#42526E]",
  },
  {
    status: TaskStatus.IN_PROGRESS,
    label: "IN PROGRESS",
    headerColor: "text-[#0052CC]",
    badgeBg: "bg-[#DEEBFF]",
    badgeText: "text-[#0747A6]",
  },
  {
    status: TaskStatus.IN_REVIEW,
    label: "IN REVIEW",
    headerColor: "text-[#FF8B00]",
    badgeBg: "bg-[#FFF0B3]",
    badgeText: "text-[#A54800]",
  },
  {
    status: TaskStatus.DONE,
    label: "DONE",
    headerColor: "text-[#006644]",
    badgeBg: "bg-[#E3FCEF]",
    badgeText: "text-[#006644]",
  },
];

export default function BoardView({
  tasks,
  onTaskClick,
  onTaskMove,
  onAddTask,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask?: (status: TaskStatus) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4 items-start h-full">
      {COLUMNS.map((col) => {
        const columnTasks = getTasksByStatus(tasks, col.status);

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
                <h3 className={`text-xs font-bold tracking-wider ${col.headerColor}`}>
                  {col.label}
                </h3>
                <span className={`inline-flex items-center justify-center h-5 px-1.5 rounded-full text-[10px] font-bold ${col.badgeBg} ${col.badgeText}`}>
                  {columnTasks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onAddTask?.(col.status)}
                className="grid h-6 w-6 place-items-center rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
                title={`Tạo công việc trong ${col.label}`}
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {/* Task cards list */}
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                />
              ))}

              {columnTasks.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center rounded border border-dashed border-slate-300 py-10 text-xs font-medium text-slate-400 bg-slate-50/50">
                  <span>Không có công việc</span>
                  {onAddTask && (
                    <button
                      type="button"
                      onClick={() => onAddTask(col.status)}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-[#0052CC] hover:underline"
                    >
                      <Plus className="h-3 w-3" strokeWidth={2.5} />
                      Thêm công việc
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Inline quick create button at bottom (if tasks exist) */}
            {columnTasks.length > 0 && onAddTask && (
              <button
                type="button"
                onClick={() => onAddTask(col.status)}
                className="mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition text-left px-2"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Tạo công việc</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

