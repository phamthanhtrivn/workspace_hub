"use client";

import React, { useState } from "react";
import {
  Plus,
  StickyNote,
  X,
  Target,
  ChevronRight,
  Pencil,
  Check,
  Sparkles,
  Minus,
} from "lucide-react";
import type { PomodoroActiveTask, PomodoroStatus, PomodoroTaskAction } from "../types/pomodoro";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { defaultFocusStart, scheduleFocusTask } from "../utils/schedule-task";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { cleanTaskDescription } from "@/features/calendar/utils/calendar-event.utils";
import { updateCalendarEvent } from "@/features/calendar/api/calendar.api";
import { updateTask } from "@/features/project/api/task.api";
import { useQueryClient } from "@tanstack/react-query";
import { calendarKeys } from "@/features/calendar/hooks/use-calendar-queries";
import { PomodoroCalendarTaskList } from "./pomodoro-calendar-task-list";
import { usePomodoroCalendarTasks } from "../hooks/use-pomodoro-calendar-tasks";
import { PomodoroProjectTaskList } from "./pomodoro-project-task-list";
import { PomodoroTaskActions } from "./pomodoro-task-actions";
import { MAX_POMODORO_NOTES_LENGTH } from "../utils/pomodoro-notes";

interface PomodoroActiveTaskProps {
  taskRevision?: number;
  timerStatus?: PomodoroStatus;
  taskActionDisabled?: boolean;
  onTaskAction?: (action: PomodoroTaskAction) => Promise<void>;
  activeTask: PomodoroActiveTask | null;
  notes: string;
  onClearTask?: () => void;
  onNotesChange: (notes: string) => void;
  onSetCustomTask?: (task: PomodoroActiveTask) => void;
  onUpdateActiveTask?: (task: PomodoroActiveTask) => void;
  focusDurationMinutes?: number;
}

const DEFAULT_QUICK_POMODOROS = 2;
const MAX_QUICK_POMODOROS = 20;
const DEFAULT_QUICK_PRIORITY = "MEDIUM" as const;

export const PomodoroActiveTaskCard = React.memo(function PomodoroActiveTaskCard({
  taskRevision,
  timerStatus = "IDLE",
  taskActionDisabled = false,
  onTaskAction,
  activeTask,
  notes,
  onClearTask,
  onNotesChange,
  onSetCustomTask,
  onUpdateActiveTask,
  focusDurationMinutes = 25,
}: PomodoroActiveTaskProps) {
  // Empty state custom task input
  const [quickTitle, setQuickTitle] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [quickPomodoros, setQuickPomodoros] = useState(DEFAULT_QUICK_POMODOROS);
  const [quickError, setQuickError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  // Inline editing state for active task title & task note
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [isEditingTaskNote, setIsEditingTaskNote] = useState(false);
  const [editedTaskNote, setEditedTaskNote] = useState("");
  const [isSavingTaskNote, setIsSavingTaskNote] = useState(false);
  const [taskNoteError, setTaskNoteError] = useState("");
  const [isTaskNoteExpanded, setIsTaskNoteExpanded] = useState(false);
  const queryClient = useQueryClient();

  // Subtask & Notes states
  const [showNotes, setShowNotes] = useState(false);
  const {
    todayTasks,
    calendarTaskError,
    taskOrderError,
    isSavingTaskOrder,
    refreshTasks,
    updateLocalTask,
    reorderTasks: reorderCalendarTasks,
    deleteTask: deleteCalendarTask,
  } = usePomodoroCalendarTasks({
    taskRevision,
    activeTask,
    onClearTask,
    onUpdateActiveTask,
  });

  const selectCalendarTask = (event: CalendarEvent) => {
    setIsEditingTitle(false);
    setTitleError("");
    setIsEditingTaskNote(false);
    setTaskNoteError("");
    setIsTaskNoteExpanded(false);
    onSetCustomTask?.({
      id: event.sourceId ?? event.id,
      calendarEventId: event.id,
      title: event.title,
      description: cleanTaskDescription(event.description) || undefined,
      projectId: event.calendar?.projectId ?? undefined,
      projectName: event.calendar?.projectId
        ? event.calendar.name
        : "Calendar task",
      projectColor: event.calendar?.color ?? event.color ?? "#1C4D8D",
      estimatedPomodoros: Math.max(
        1,
        Math.ceil(
          (new Date(event.endAt).getTime() -
            new Date(event.startAt).getTime()) /
            (focusDurationMinutes * 60_000),
        ),
      ),
      completedPomodoros: 0,
      checklists: [],
    });
  };

  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isCreating) return;
    const scheduledPomodoros = activeTask
      ? quickPomodoros
      : DEFAULT_QUICK_POMODOROS;

    setIsCreating(true);
    setQuickError("");
    let calendarEventId: string;
    try {
      calendarEventId = await scheduleFocusTask({
        title: quickTitle.trim(),
        startsAt: defaultFocusStart(),
        pomodoros: scheduledPomodoros,
        focusDurationMinutes,
        description: quickNote,
      });
    } catch (error) {
      setQuickError(
        error instanceof Error
          ? error.message
          : "Unable to create a task in Calendar.",
      );
      setIsCreating(false);
      return;
    }

    const newTask: PomodoroActiveTask = {
      id: calendarEventId,
      calendarEventId,
      title: quickTitle.trim(),
      description: cleanTaskDescription(quickNote) || undefined,
      projectName: "Personal task",
      projectColor: "#1C4D8D",
      priority: DEFAULT_QUICK_PRIORITY,
      estimatedPomodoros: scheduledPomodoros,
      completedPomodoros: 0,
      checklists: [],
    };

    if (!activeTask) {
      onSetCustomTask?.(newTask);
    } else {
      refreshTasks();
    }
    setQuickTitle("");
    setQuickNote("");
    setQuickPomodoros(DEFAULT_QUICK_POMODOROS);
    setIsQuickCreateOpen(false);
    setIsCreating(false);
  };

  const handleStartEditingTitle = () => {
    if (!activeTask) return;
    setTitleError("");
    setEditedTitle(activeTask.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (
      !activeTask ||
      !editedTitle.trim() ||
      !onUpdateActiveTask ||
      isSavingTitle
    )
      return;
    const title = editedTitle.trim();
    setIsSavingTitle(true);
    setTitleError("");
    try {
      if (activeTask.calendarEventId) {
        await updateCalendarEvent(activeTask.calendarEventId, { title });
        updateLocalTask(activeTask.calendarEventId, { title });
        void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      } else if (activeTask.projectId) {
        await updateTask(activeTask.id, { title });
        void queryClient.invalidateQueries({ queryKey: ["projects", "pomodoro-today"] });
        void queryClient.invalidateQueries({
          queryKey: ["projects", activeTask.projectId, "tasks"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["tasks", activeTask.id],
        });
      }
      onUpdateActiveTask({ ...activeTask, title });
      setIsEditingTitle(false);
    } catch {
      setTitleError("Unable to save the task name. Please try again.");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const matchedCalendarTask = activeTask?.calendarEventId
    ? todayTasks.find((event) => event.id === activeTask.calendarEventId)
    : undefined;
  const activeTaskNote = cleanTaskDescription(
    activeTask?.description !== undefined
      ? activeTask.description
      : matchedCalendarTask?.description,
  );

  const handleStartEditingTaskNote = () => {
    if (!activeTask) return;
    setTaskNoteError("");
    setEditedTaskNote(activeTaskNote);
    setIsEditingTaskNote(true);
  };

  const handleSaveTaskNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTask || !onUpdateActiveTask || isSavingTaskNote) return;
    const description = editedTaskNote.trim();
    setIsSavingTaskNote(true);
    setTaskNoteError("");
    try {
      if (activeTask.calendarEventId) {
        await updateCalendarEvent(activeTask.calendarEventId, {
          description: description || null,
        });
        updateLocalTask(activeTask.calendarEventId, {
          description: description || null,
        });
        void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      } else if (activeTask.projectId) {
        await updateTask(activeTask.id, { description });
        void queryClient.invalidateQueries({ queryKey: ["projects", "pomodoro-today"] });
        void queryClient.invalidateQueries({
          queryKey: ["projects", activeTask.projectId, "tasks"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["tasks", activeTask.id],
        });
      }
      onUpdateActiveTask({
        ...activeTask,
        description: description || undefined,
      });
      setIsEditingTaskNote(false);
    } catch {
      setTaskNoteError("Unable to save task notes. Please try again.");
    } finally {
      setIsSavingTaskNote(false);
    }
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
      <p className="text-xs font-semibold text-slate-700">
        Today&apos;s Calendar tasks
      </p>
      {calendarTaskError ? (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          Unable to load Calendar tasks.
        </p>
      ) : todayTasks.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">
          No Calendar tasks for today.
        </p>
      ) : (
        <PomodoroCalendarTaskList
          tasks={todayTasks}
          activeEventId={activeTask?.calendarEventId}
          isSaving={isSavingTaskOrder}
          onSelect={selectCalendarTask}
          onReorder={(activeId, overId) =>
            void reorderCalendarTasks(activeId, overId)
          }
          onDelete={deleteCalendarTask}
        />
      )}
      {isSavingTaskOrder && (
        <p role="status" className="mt-1.5 text-[11px] text-slate-400">
          Saving task order...
        </p>
      )}
      {taskOrderError && (
        <p role="alert" className="mt-1.5 text-xs text-rose-600">
          {taskOrderError}
        </p>
      )}
    </div>
  );

  const todayProjectTaskList = (
    <PomodoroProjectTaskList
      activeTask={activeTask}
      focusDurationMinutes={focusDurationMinutes}
      onSelect={(task) => {
        setIsEditingTitle(false);
        setTitleError("");
        setIsEditingTaskNote(false);
        setTaskNoteError("");
        setIsTaskNoteExpanded(false);
        onSetCustomTask?.(task);
      }}
    />
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
                Focus session goal
              </h4>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            <Sparkles className="size-2.5 text-amber-500" /> Personal / Project
          </span>
        </div>

        {/* Quick Add Custom Task Form */}
        <form onSubmit={handleCreateCustomTask} className="space-y-3">
          <div>
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="What would you like to focus on in this session?..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-primary,#1C4D8D)] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <textarea
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            placeholder="Task notes (optional)..."
            maxLength={2000}
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[var(--color-primary,#1C4D8D)] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-2xs"
          />

          {quickError && (
            <p role="alert" className="text-xs text-rose-600">
              {quickError}
            </p>
          )}

          {/* Action Row */}
          <div className="pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={!quickTitle.trim() || isCreating}
              className="w-full rounded-xl bg-[var(--color-primary,#1C4D8D)] text-white hover:bg-[var(--color-primary-strong,#0F2854)] text-xs font-semibold shadow-xs h-9"
            >
              <Plus className="mr-1.5 size-4" />
              {isCreating ? "Creating..." : "Set goal & add to Calendar"}
            </Button>
          </div>
        </form>
        {todayTaskList}
        {todayProjectTaskList}
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 overflow-hidden">
          {activeTask.projectName && !isCustomTask ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100/80 border border-slate-200/50 truncate max-w-[200px]"
              title={activeTask.projectName}
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{
                  backgroundColor: activeTask.projectColor || "#1C4D8D",
                }}
              />
              <span className="truncate">{activeTask.projectName}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/60">
              <Sparkles className="size-3 text-blue-600" />
              <span>Personal task</span>
            </span>
          )}

          {activeTask.priority && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5 font-semibold",
                priorityStyles,
              )}
            >
              {activeTask.priority}
            </Badge>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setQuickError("");
              setIsQuickCreateOpen((isOpen) => !isOpen);
            }}
            aria-expanded={isQuickCreateOpen}
            aria-controls="active-task-quick-create"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-800"
          >
            <Plus className="size-3.5" />
            Create a task
          </button>
        </div>
      </div>

      {isQuickCreateOpen && (
        <form
          id="active-task-quick-create"
          onSubmit={handleCreateCustomTask}
          className="mt-3 space-y-2.5 rounded-xl border border-blue-100 bg-blue-50/50 p-3"
        >
          <div>
            <label
              htmlFor="active-task-title"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              New task
            </label>
            <input
              id="active-task-title"
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Enter a task name..."
              autoFocus
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label
              htmlFor="active-task-note"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Notes{" "}
              <span className="font-normal text-slate-400">
                (optional)
              </span>
            </label>
            <textarea
              id="active-task-note"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Add task notes..."
              maxLength={2000}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-slate-700">
                Pomodoro count
              </p>
              <p className="text-[11px] text-slate-400">
                {quickPomodoros * focusDurationMinutes} estimated minutes
              </p>
            </div>
            <div
              role="group"
              aria-label="Choose Pomodoro count"
              className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
            >
              <button
                type="button"
                onClick={() =>
                  setQuickPomodoros((count) => Math.max(1, count - 1))
                }
                disabled={quickPomodoros === 1}
                aria-label="Decrease Pomodoro count"
                className="flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus className="size-3.5" />
              </button>
              <output
                aria-live="polite"
                className="min-w-20 px-2 text-center text-xs font-bold tabular-nums text-slate-800"
              >
                {quickPomodoros} Pomodoro
              </output>
              <button
                type="button"
                onClick={() =>
                  setQuickPomodoros((count) =>
                    Math.min(MAX_QUICK_POMODOROS, count + 1),
                  )
                }
                disabled={quickPomodoros === MAX_QUICK_POMODOROS}
                aria-label="Increase Pomodoro count"
                className="flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          {quickError && (
            <p role="alert" className="text-xs text-rose-600">
              {quickError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuickError("");
                setIsQuickCreateOpen(false);
              }}
              className="h-8 px-3 text-xs text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!quickTitle.trim() || isCreating}
              className="h-8 bg-[var(--color-primary,#1C4D8D)] px-3 text-xs font-semibold text-white hover:bg-[var(--color-primary-strong,#0F2854)]"
            >
              <Plus className="mr-1 size-3.5" />
              {isCreating ? "Creating..." : "Add to Calendar"}
            </Button>
          </div>
        </form>
      )}

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
              disabled={isSavingTitle}
              className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              <Check className="size-3.5 mr-1" /> Save
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
                title="Rename task"
                className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition-all shrink-0"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>
        )}
        {titleError && (
          <p role="alert" className="mt-1 text-xs text-rose-600">
            {titleError}
          </p>
        )}

        {/* Active Task Note & Inline Editor */}
        {isEditingTaskNote ? (
          <form
            onSubmit={handleSaveTaskNote}
            className="mt-2.5 space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-2.5"
          >
            <label
              htmlFor="active-task-description-input"
              className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800"
            >
              <StickyNote className="size-3.5 text-amber-500" />
              Task notes
            </label>
            <textarea
              id="active-task-description-input"
              value={editedTaskNote}
              onChange={(e) => setEditedTaskNote(e.target.value)}
              placeholder="Enter notes, specific goals or steps to remember for this task..."
              maxLength={2000}
              rows={3}
              autoFocus
              className="w-full resize-none rounded-lg border border-amber-200/90 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
            <div className="flex items-center justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTaskNoteError("");
                  setIsEditingTaskNote(false);
                }}
                className="h-7 px-2.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingTaskNote}
                className="h-7 bg-[var(--color-primary,#1C4D8D)] px-3 text-xs font-semibold text-white hover:bg-[var(--color-primary-strong,#0F2854)]"
              >
                <Check className="mr-1 size-3.5" />
                {isSavingTaskNote ? "Saving..." : "Save notes"}
              </Button>
            </div>
          </form>
        ) : activeTaskNote ? (
          <div className="group/note mt-2.5 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-amber-50/30 to-white px-3 py-2.5 transition-colors hover:border-amber-300/80">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsTaskNoteExpanded((prev) => !prev)}
                aria-expanded={isTaskNoteExpanded}
                title={
                  isTaskNoteExpanded ? "Click to collapse notes" : activeTaskNote
                }
                className="flex min-w-0 flex-1 items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded-md"
              >
                <StickyNote
                  className="mt-0.5 size-3.5 shrink-0 text-amber-500"
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap break-words",
                    !isTaskNoteExpanded && "line-clamp-2",
                  )}
                >
                  {activeTaskNote}
                </span>
              </button>
              {onUpdateActiveTask && (
                <button
                  type="button"
                  onClick={handleStartEditingTaskNote}
                  title="Edit task notes"
                  aria-label="Edit task notes"
                  className="shrink-0 rounded-md p-1 text-slate-400 opacity-80 transition-all hover:bg-amber-100/60 hover:text-amber-700 group-hover/note:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          onUpdateActiveTask && (
            <button
              type="button"
              onClick={handleStartEditingTaskNote}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-700"
            >
              <StickyNote className="size-3 text-amber-500" />
              <span>Add task notes...</span>
            </button>
          )
        )}
        {taskNoteError && (
          <p role="alert" className="mt-1 text-xs text-rose-600">
            {taskNoteError}
          </p>
        )}

        {/* Progress Bar & Pomodoro Stepper */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 font-medium">
            <span>Focus progress:</span>
            <strong className="text-slate-800 font-bold">
              {activeTask.completedPomodoros || 0}
            </strong>
            <span>/</span>
            <span className="font-semibold text-slate-700">
              {activeTask.estimatedPomodoros || 1} Pomodoros 🍅
            </span>

            {/* Quick Adjust Stepper */}
            {onUpdateActiveTask && (
              <div className="flex items-center gap-0.5 ml-1 bg-slate-100 rounded-md p-0.5 border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => handleAdjustPomodoroEstimate(-1)}
                  disabled={(activeTask.estimatedPomodoros || 1) <= 1}
                  title="Decrease by one Pomodoro"
                  className="p-0.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-white transition-all"
                >
                  <Minus className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustPomodoroEstimate(1)}
                  title="Increase by one Pomodoro"
                  className="p-0.5 text-slate-500 hover:text-slate-800 rounded hover:bg-white transition-all"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {onTaskAction && (
        <PomodoroTaskActions
          key={activeTask.id}
          task={activeTask}
          timerStatus={timerStatus}
          disabled={taskActionDisabled}
          onAction={onTaskAction}
        />
      )}

      {todayTaskList}

      {todayProjectTaskList}

      {/* Quick Notes Scratchpad */}
      <div className="mt-3.5 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <StickyNote className="size-3.5 text-amber-500" />
          <span>
            {showNotes
              ? "Hide session notes"
              : "Quick notes while focusing"}
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
            maxLength={MAX_POMODORO_NOTES_LENGTH}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Jot down ideas, bugs or things to remember..."
            rows={2}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-amber-50/30 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:outline-none resize-none transition-all"
          />
        )}
      </div>
    </div>
  );
});
