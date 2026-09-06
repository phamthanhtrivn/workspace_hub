"use client";

import { CalendarDays, ChartGantt } from "lucide-react";
import type { Task, TaskDependency } from "@/features/project/types/project";
import {
  GANTT_STATUS_LEGEND,
  TASK_STATUS_COLORS,
} from "@/features/project/constants/task.constants";
import { useGanttTimeline } from "@/features/project/hooks/use-gantt-timeline";

export default function GanttView({
  tasks,
  onTaskClick,
  dependencies = [],
}: {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  dependencies?: TaskDependency[];
}) {
  const {
    rangeFormatted,
    days,
    datedTasks,
    unscheduledTasks,
    timelineWidth,
    todayOffset,
    dayWidth,
    labelWidth,
    getBarColor,
  } = useGanttTimeline({ tasks, dependencies });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <ChartGantt className="h-5 w-5 text-[#0052CC]" />
          <div>
            <h2 className="text-sm font-black text-[#172B4D]">Gantt chart</h2>
            <p className="text-xs font-semibold text-slate-400">
              {rangeFormatted} · {datedTasks.length} task có lịch
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
          {GANTT_STATUS_LEGEND.map((item) => (
            <span key={item.status} className="inline-flex items-center gap-1">
              <i className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
        <div className="min-w-max">
          <div
            className="grid border-b border-slate-200 bg-slate-50"
            style={{
              gridTemplateColumns: `${labelWidth}px ${timelineWidth}px`,
            }}
          >
            <div className="border-r border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
              Task
            </div>
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)`,
              }}
            >
              {days.map((day) => (
                <div
                  key={day.isoKey}
                  className={`border-r border-slate-200 px-1 py-2 text-center text-[10px] font-bold ${
                    day.isWeekend
                      ? "bg-slate-100/70 text-slate-400"
                      : "text-slate-600"
                  }`}
                >
                  <div>{day.dayNumberFormatted}</div>
                  {day.isFirstOfMonth && (
                    <div className="text-[9px] font-black text-slate-400">
                      {day.monthFormatted}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {datedTasks.length > 0 ? (
              datedTasks.map(
                ({
                  task,
                  left,
                  width,
                  isSubtask,
                  predecessors,
                  dateRangeFormatted,
                }) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onTaskClick?.(task)}
                    className="grid w-full border-b border-slate-100 text-left transition hover:bg-blue-50/40"
                    style={{
                      gridTemplateColumns: `${labelWidth}px ${timelineWidth}px`,
                    }}
                  >
                    <span
                      className={`flex min-w-0 items-center gap-2 border-r border-slate-200 px-4 py-3 ${isSubtask ? "pl-9" : ""}`}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${TASK_STATUS_COLORS[task.status]?.dot || "bg-slate-300"}`}
                      />
                      <span className="min-w-0 truncate text-xs font-bold text-[#172B4D]">
                        {task.title}
                      </span>
                      {predecessors.length > 0 && (
                        <span
                          className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700"
                          title="Task này có dependency"
                        >
                          ← {predecessors.map((item) => item.title).join(", ")}
                        </span>
                      )}
                    </span>
                    <span
                      className="relative block min-h-12"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, rgb(226 232 240 / 0.7) 1px, transparent 1px)",
                        backgroundSize: `${dayWidth}px 100%`,
                      }}
                    >
                      {todayOffset >= 0 && todayOffset < days.length && (
                        <span
                          className="absolute bottom-0 top-0 w-px bg-red-300/70"
                          style={{
                            left: `${todayOffset * dayWidth + dayWidth / 2}px`,
                          }}
                        />
                      )}
                      <span
                        className={`absolute top-1/2 h-6 -translate-y-1/2 rounded-md px-2 text-[10px] font-bold leading-6 text-white shadow-sm ${getBarColor(task.status)}`}
                        style={{ left: `${left}px`, width: `${width}px` }}
                        title={`${task.title}: ${dateRangeFormatted}`}
                      >
                        <span className="block truncate">{task.title}</span>
                      </span>
                    </span>
                  </button>
                ),
              )
            ) : (
              <div className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                Chưa có task nào được lên lịch.
              </div>
            )}
          </div>
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
