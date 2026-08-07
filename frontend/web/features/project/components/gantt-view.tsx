"use client";

import { CalendarDays, ChartGantt } from "lucide-react";
import {
  type Task,
  TaskStatus,
  type TaskDependency,
} from "@/features/project/types/project";

const DAY_WIDTH = 44;
const LABEL_WIDTH = 250;

function toLocalDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dayDifference(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("vi-VN", { day: "2-digit" });
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("vi-VN", { month: "short" });
}

function formatRange(start: Date, end: Date): string {
  return `${start.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" })}`;
}

function taskStart(task: Task): Date | undefined {
  const value = task.startDate || task.dueDate;
  return value ? toLocalDate(value) : undefined;
}

function taskEnd(task: Task): Date | undefined {
  const value = task.dueDate || task.startDate;
  return value ? toLocalDate(value) : undefined;
}

function barColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.DONE:
      return "bg-emerald-500";
    case TaskStatus.IN_PROGRESS:
      return "bg-blue-600";
    case TaskStatus.IN_REVIEW:
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}

export default function GanttView({
  tasks,
  onTaskClick,
  dependencies = [],
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  dependencies?: TaskDependency[];
}) {
  const activeTasks = tasks.filter((task) => !task.archived);
  const datedTasks = activeTasks.filter(
    (task) => taskStart(task) && taskEnd(task),
  );
  const unscheduledTasks = activeTasks.filter(
    (task) => !taskStart(task) || !taskEnd(task),
  );
  const taskById = new Map(activeTasks.map((task) => [task.id, task]));
  const predecessorsBySuccessor = new Map<string, Task[]>();
  dependencies.forEach((dependency) => {
    const predecessor = taskById.get(dependency.predecessorTaskId);
    if (!predecessor) return;
    const list = predecessorsBySuccessor.get(dependency.successorTaskId) || [];
    list.push(predecessor);
    predecessorsBySuccessor.set(dependency.successorTaskId, list);
  });

  const range = (() => {
    if (datedTasks.length === 0) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { start, end: addDays(start, 13) };
    }

    const starts = datedTasks.map((task) => taskStart(task) as Date);
    const ends = datedTasks.map((task) => taskEnd(task) as Date);
    const start = addDays(
      new Date(Math.min(...starts.map((date) => date.getTime()))),
      -2,
    );
    const end = addDays(
      new Date(Math.max(...ends.map((date) => date.getTime()))),
      2,
    );
    return { start, end };
  })();

  const days = (() => {
    const count = dayDifference(range.start, range.end) + 1;
    return Array.from({ length: count }, (_, index) =>
      addDays(range.start, index),
    );
  })();

  const todayOffset = dayDifference(
    range.start,
    toLocalDate(dateKey(new Date())),
  );
  const timelineWidth = days.length * DAY_WIDTH;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <ChartGantt className="h-5 w-5 text-[#0052CC]" />
          <div>
            <h2 className="text-sm font-black text-[#172B4D]">Gantt chart</h2>
            <p className="text-xs font-semibold text-slate-400">
              {formatRange(range.start, range.end)} · {datedTasks.length} task
              có lịch
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            To Do
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            In Progress
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Done
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
        <div className="min-w-max">
          <div
            className="grid border-b border-slate-200 bg-slate-50"
            style={{
              gridTemplateColumns: `${LABEL_WIDTH}px ${timelineWidth}px`,
            }}
          >
            <div className="border-r border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Task
            </div>
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `repeat(${days.length}, ${DAY_WIDTH}px)`,
              }}
            >
              {days.map((day) => (
                <div
                  key={dateKey(day)}
                  className="border-r border-slate-200 px-1 py-2 text-center last:border-r-0"
                >
                  <div className="text-[9px] font-bold uppercase text-slate-400">
                    {day.toLocaleDateString("vi-VN", { weekday: "short" })}
                  </div>
                  <div className="text-xs font-black text-[#172B4D]">
                    {formatDay(day)}
                  </div>
                  {day.getDate() === 1 && (
                    <div className="text-[9px] font-semibold text-slate-400">
                      {formatMonth(day)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {datedTasks.length > 0 ? (
            datedTasks.map((task) => {
              const start = taskStart(task) as Date;
              const end = taskEnd(task) as Date;
              const left =
                Math.max(0, dayDifference(range.start, start)) * DAY_WIDTH + 4;
              const width = Math.max(
                32,
                (dayDifference(start, end) + 1) * DAY_WIDTH - 8,
              );
              const isSubtask = Boolean(task.parentTaskId);

              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onTaskClick?.(task)}
                  className="grid w-full border-b border-slate-100 text-left transition hover:bg-blue-50/40"
                  style={{
                    gridTemplateColumns: `${LABEL_WIDTH}px ${timelineWidth}px`,
                  }}
                >
                  <span
                    className={`flex min-w-0 items-center gap-2 border-r border-slate-200 px-4 py-3 ${isSubtask ? "pl-9" : ""}`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${task.status === TaskStatus.DONE ? "bg-emerald-500" : "bg-slate-300"}`}
                    />
                    <span className="min-w-0 truncate text-xs font-bold text-[#172B4D]">
                      {task.title}
                    </span>
                    {(predecessorsBySuccessor.get(task.id) || []).length >
                      0 && (
                      <span
                        className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700"
                        title="Task này có dependency"
                      >
                        ←{" "}
                        {predecessorsBySuccessor
                          .get(task.id)
                          ?.map((item) => item.title)
                          .join(", ")}
                      </span>
                    )}
                  </span>
                  <span
                    className="relative block min-h-12"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgb(226 232 240 / 0.7) 1px, transparent 1px)",
                      backgroundSize: `${DAY_WIDTH}px 100%`,
                    }}
                  >
                    {todayOffset >= 0 && todayOffset < days.length && (
                      <span
                        className="absolute bottom-0 top-0 w-px bg-red-300/70"
                        style={{
                          left: `${todayOffset * DAY_WIDTH + DAY_WIDTH / 2}px`,
                        }}
                      />
                    )}
                    <span
                      className={`absolute top-1/2 h-6 -translate-y-1/2 rounded-md px-2 text-[10px] font-bold leading-6 text-white shadow-sm ${barColor(task.status)}`}
                      style={{ left: `${left}px`, width: `${width}px` }}
                      title={`${task.title}: ${formatRange(start, end)}`}
                    >
                      <span className="block truncate">{task.title}</span>
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
              Chưa có task nào được lên lịch.
            </div>
          )}
        </div>
      </div>

      {unscheduledTasks.length > 0 && (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-black text-slate-600">
              Chưa lên lịch ({unscheduledTasks.length})
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {unscheduledTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onTaskClick?.(task)}
                className="rounded bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-[#0052CC]"
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
