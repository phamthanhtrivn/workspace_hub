"use client";

import { type Task, TaskStatus } from "@/types/project";
import { getTasksByStatus } from "@/lib/mock-data";
import TaskCard from "./task-card";
import { Plus, Circle, Loader2, Eye, CheckCircle2 } from "lucide-react";

const COLUMNS: {
  status: TaskStatus;
  label: string;
  icon: React.ElementType;
  headerColor: string;
  dotColor: string;
}[] = [
  {
    status: TaskStatus.TODO,
    label: "To Do",
    icon: Circle,
    headerColor: "text-slate-600",
    dotColor: "bg-slate-400",
  },
  {
    status: TaskStatus.IN_PROGRESS,
    label: "In Progress",
    icon: Loader2,
    headerColor: "text-blue-600",
    dotColor: "bg-blue-500",
  },
  {
    status: TaskStatus.IN_REVIEW,
    label: "In Review",
    icon: Eye,
    headerColor: "text-amber-600",
    dotColor: "bg-amber-500",
  },
  {
    status: TaskStatus.DONE,
    label: "Done",
    icon: CheckCircle2,
    headerColor: "text-emerald-600",
    dotColor: "bg-emerald-500",
  },
];

export default function BoardView({
  tasks,
  onTaskClick,
  onTaskMove,
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const Icon = col.icon;
        const columnTasks = getTasksByStatus(tasks, col.status);

        return (
          <div
            key={col.status}
            className="flex flex-col rounded-2xl bg-slate-50/80 p-3"
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
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                <h3
                  className={`text-sm font-black ${col.headerColor}`}
                >
                  {col.label}
                </h3>
                <span className="grid h-5 min-w-5 place-items-center rounded-md bg-white px-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
                  {columnTasks.length}
                </span>
              </div>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-600 hover:shadow-sm"
                title={`Add task to ${col.label}`}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Task cards */}
            <div className="flex flex-1 flex-col gap-2.5">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                />
              ))}

              {columnTasks.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-8 text-xs font-semibold text-slate-400">
                  Không có task
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
