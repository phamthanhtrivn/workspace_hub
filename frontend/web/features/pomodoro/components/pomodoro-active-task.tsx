"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  StickyNote,
  X,
  Target,
  FolderKanban,
  ChevronRight,
  Pencil,
  Check,
  Sparkles,
  Minus,
} from "lucide-react";
import type { PomodoroActiveTask } from "../types/pomodoro";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { defaultFocusStart, scheduleFocusTask } from "../utils/schedule-task";
import { getAllCalendarTasks, getCalendars } from "@/features/calendar/api/calendar.api";
import { EventStatus, type CalendarEvent } from "@/features/calendar/types/calendar.types";

interface PomodoroActiveTaskProps {
  activeTask: PomodoroActiveTask | null;
  notes: string;
  onSelectTaskClick: () => void;
  onClearTask: () => void;
  onNotesChange: (notes: string) => void;
  onSetCustomTask?: (task: PomodoroActiveTask) => void;
  onUpdateActiveTask?: (task: PomodoroActiveTask) => void;
}

export function PomodoroActiveTaskCard({
  activeTask,
  notes,
  onSelectTaskClick,
  onClearTask,
  onNotesChange,
  onSetCustomTask,
  onUpdateActiveTask,
}: PomodoroActiveTaskProps) {
  // Empty state custom task input
  const [quickTitle, setQuickTitle] = useState("");
  const [quickError, setQuickError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [quickPomodoros, setQuickPomodoros] = useState(2);
  const [quickPriority, setQuickPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  >("MEDIUM");

  // Inline editing state for active task title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  // Subtask & Notes states
  const [showNotes, setShowNotes] = useState(false);
  const [todayTasks, setTodayTasks] = useState<CalendarEvent[]>([]);
  const [calendarTaskError, setCalendarTaskError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const refreshTasks = () => {
      void Promise.all([getAllCalendarTasks(), getCalendars()])
        .then(([events, calendars]) => {
          if (!mounted) return;
          const today = new Date();
          const projectCalendarIds = new Set(calendars.filter((calendar) => calendar.projectId).map((calendar) => calendar.id));
          setTodayTasks(events.filter((event) => {
            const start = new Date(event.startAt);
            return event.status !== EventStatus.CANCELLED && !event.completedAt &&
              !event.calendar?.projectId && !projectCalendarIds.has(event.calendarId) &&
              start.getFullYear() === today.getFullYear() &&
              start.getMonth() === today.getMonth() &&
              start.getDate() === today.getDate();
          }));
          setCalendarTaskError(false);
        })
        .catch(() => { if (mounted) setCalendarTaskError(true); });
    };
    refreshTasks();
    window.addEventListener("focus", refreshTasks);
    return () => {
      mounted = false;
      window.removeEventListener("focus", refreshTasks);
    };
  }, [activeTask]);

  const selectCalendarTask = (event: CalendarEvent) => {
    onSetCustomTask?.({
      id: event.sourceId ?? event.id,
      calendarEventId: event.id,
      title: event.title,
      projectId: event.calendar?.projectId ?? undefined,
      projectName: event.calendar?.projectId ? event.calendar.name : "Nhiệm vụ Calendar",
      projectColor: event.calendar?.color ?? event.color ?? "#1C4D8D",
      estimatedPomodoros: Math.max(1, Math.ceil((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / (25 * 60_000))),
      completedPomodoros: 0,
      checklists: [],
    });
  };

  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isCreating) return;

    setIsCreating(true);
    setQuickError("");
    let calendarEventId: string;
    try {
      calendarEventId = await scheduleFocusTask(quickTitle.trim(), defaultFocusStart(), quickPomodoros);
    } catch (error) {
      setQuickError(error instanceof Error ? error.message : "Không thể tạo nhiệm vụ trên Calendar.");
      setIsCreating(false);
      return;
    }

    const newTask: PomodoroActiveTask = {
      id: calendarEventId,
      calendarEventId,
      title: quickTitle.trim(),
      projectName: "Nhiệm vụ cá nhân",
      projectColor: "#1C4D8D",
      priority: quickPriority,
      estimatedPomodoros: quickPomodoros,
      completedPomodoros: 0,
      checklists: [],
    };

    if (onSetCustomTask) {
      onSetCustomTask(newTask);
    }
    setQuickTitle("");
    setIsCreating(false);
  };

  const handleStartEditingTitle = () => {
    if (!activeTask) return;
    setEditedTitle(activeTask.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTask || !editedTitle.trim() || !onUpdateActiveTask) return;
    onUpdateActiveTask({
      ...activeTask,
      title: editedTitle.trim(),
    });
    setIsEditingTitle(false);
  };

  const handleAdjustPomodoroEstimate = (delta: number) => {
    if (!activeTask || !onUpdateActiveTask) return;
    const currentEst = activeTask.estimatedPomodoros || 1;
    const newEst = Math.max(1, Math.min(20, currentEst + delta));
    onUpdateActiveTask({
      ...activeTask,
      estimatedPomodoros: newEst,
    });
  };

  const priorityStyles = {
    LOW: "bg-slate-100 text-slate-700 border-slate-200",
    MEDIUM: "bg-sky-50 text-sky-700 border-sky-200",
    HIGH: "bg-amber-50 text-amber-700 border-amber-200",
    URGENT: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
  }[activeTask?.priority || "MEDIUM"];

  const todayTaskList = (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <p className="text-xs font-semibold text-slate-700">Task Calendar hôm nay</p>
      {calendarTaskError ? <p role="alert" className="mt-2 text-xs text-rose-600">Không tải được task Calendar.</p> :
        todayTasks.length === 0 ? <p className="mt-2 text-xs text-slate-400">Chưa có task Calendar nào hôm nay.</p> :
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {todayTasks.map((event) => (
            <button key={event.id} type="button" onClick={() => selectCalendarTask(event)} className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs hover:border-blue-300 hover:bg-blue-50", activeTask?.calendarEventId === event.id ? "border-blue-300 bg-blue-50" : "border-slate-200")}>
              <span className="truncate font-medium text-slate-800">{event.title}</span>
              <span className="ml-3 shrink-0 text-slate-500">{new Date(event.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
            </button>
          ))}
        </div>}
    </div>
  );

  // -------------------------------------------------------------
  // EMPTY STATE: User can directly type task here or pick project
  // -------------------------------------------------------------
  if (!activeTask) {
    return (
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/40 backdrop-blur-md transition-all hover:border-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-[var(--color-primary,#1C4D8D)] shadow-2xs">
              <Target className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Mục tiêu phiên tập trung
              </h4>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            <Sparkles className="size-2.5 text-amber-500" /> Tự do / Dự án
          </span>
        </div>

        {/* Quick Add Custom Task Form */}
        <form onSubmit={handleCreateCustomTask} className="space-y-3">
          <div>
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Bạn muốn tập trung làm gì trong phiên này?..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-primary,#1C4D8D)] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          {quickError && <p role="alert" className="text-xs text-rose-600">{quickError}</p>}

          {/* Quick Settings: Estimate & Priority */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            {/* Tomato Estimate Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">
                Ước tính:
              </span>
              <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuickPomodoros(num)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-bold transition-all",
                      quickPomodoros === num
                        ? "bg-white text-rose-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {num} 🍅
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Selector */}
            <div className="flex items-center gap-1">
              {(
                [
                  { key: "LOW", label: "Thấp", color: "text-slate-600" },
                  { key: "MEDIUM", label: "Vừa", color: "text-sky-600" },
                  { key: "HIGH", label: "Cao", color: "text-amber-600" },
                  { key: "URGENT", label: "Gấp", color: "text-rose-600" },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setQuickPriority(p.key)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all border",
                    quickPriority === p.key
                      ? "bg-white border-slate-300 shadow-2xs font-extrabold " +
                          p.color
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-600",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={!quickTitle.trim() || isCreating}
              className="flex-1 rounded-xl bg-[var(--color-primary,#1C4D8D)] text-white hover:bg-[var(--color-primary-strong,#0F2854)] text-xs font-semibold shadow-xs h-9"
            >
              <Plus className="mr-1.5 size-4" />
              {isCreating ? "Đang tạo..." : "Đặt mục tiêu & thêm vào Calendar"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSelectTaskClick}
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9 px-3 shrink-0 shadow-2xs"
            >
              <FolderKanban className="mr-1.5 size-3.5 text-slate-500" />
              Chọn task
            </Button>
          </div>
        </form>
        {todayTaskList}
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE STATE: Task is chosen or created
  // -------------------------------------------------------------
  const isCustomTask = !activeTask.projectId;

  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/40 backdrop-blur-md transition-all">
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 overflow-hidden">
          {activeTask.projectName && !isCustomTask ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100/80 border border-slate-200/50 truncate max-w-[200px]"
              title={activeTask.projectName}
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: activeTask.projectColor || "#1C4D8D" }}
              />
              <span className="truncate">{activeTask.projectName}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/60">
              <Sparkles className="size-3 text-blue-600" />
              <span>Nhiệm vụ cá nhân</span>
            </span>
          )}

          {activeTask.priority && (
            <Badge
              variant="outline"
              className={cn("text-[10px] px-2 py-0.5 font-semibold", priorityStyles)}
            >
              {activeTask.priority}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSelectTaskClick}
            className="text-xs font-semibold text-[var(--color-primary,#1C4D8D)] hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
          >
            Đổi task
          </button>
          <button
            type="button"
            onClick={onClearTask}
            title="Bỏ chọn nhiệm vụ"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Task Title & Inline Editing */}
      <div className="mt-3.5">
        {isEditingTitle ? (
          <form onSubmit={handleSaveTitle} className="flex items-center gap-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="flex-1 rounded-lg border border-blue-300 bg-blue-50/30 px-2.5 py-1 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              <Check className="size-3.5 mr-1" /> Lưu
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingTitle(false)}
              className="h-8 px-2 text-xs text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </Button>
          </form>
        ) : (
          <div className="group/title flex items-start justify-between gap-2">
            <h3 className="text-base font-extrabold text-slate-900 leading-snug tracking-tight">
              {activeTask.title}
            </h3>
            {onUpdateActiveTask && (
              <button
                type="button"
                onClick={handleStartEditingTitle}
                title="Đổi tên nhiệm vụ"
                className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition-all shrink-0"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Progress Bar & Pomodoro Stepper */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 font-medium">
            <span>Tiến độ Focus:</span>
            <strong className="text-slate-800 font-bold">
              {activeTask.completedPomodoros || 0}
            </strong>
            <span>/</span>
            <span className="font-semibold text-slate-700">
              {activeTask.estimatedPomodoros || 1} quả 🍅
            </span>

            {/* Quick Adjust Stepper */}
            {onUpdateActiveTask && (
              <div className="flex items-center gap-0.5 ml-1 bg-slate-100 rounded-md p-0.5 border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => handleAdjustPomodoroEstimate(-1)}
                  disabled={(activeTask.estimatedPomodoros || 1) <= 1}
                  title="Giảm 1 quả Pomodoro"
                  className="p-0.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-white transition-all"
                >
                  <Minus className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustPomodoroEstimate(1)}
                  title="Tăng 1 quả Pomodoro"
                  className="p-0.5 text-slate-500 hover:text-slate-800 rounded hover:bg-white transition-all"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {todayTaskList}

      {/* Quick Notes Scratchpad */}
      <div className="mt-3.5 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <StickyNote className="size-3.5 text-amber-500" />
          <span>
            {showNotes ? "Ẩn ghi chú phiên" : "Ghi chú nhanh trong lúc tập trung"}
          </span>
          <ChevronRight
            className={cn(
              "size-3 text-slate-400 transition-transform",
              showNotes && "rotate-90",
            )}
          />
        </button>

        {showNotes && (
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Ghi lại nhanh ý tưởng, bug phát hiện, hoặc điều cần nhớ..."
            rows={2}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-amber-50/30 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:outline-none resize-none transition-all"
          />
        )}
      </div>
    </div>
  );
}
