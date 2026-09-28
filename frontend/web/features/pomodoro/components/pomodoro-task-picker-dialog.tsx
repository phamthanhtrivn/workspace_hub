"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Check, Loader2 } from "lucide-react";
import { getProjects } from "@/features/project/api/project.api";
import { getProjectTasks } from "@/features/project/api/task.api";
import { getAllCalendarTasks, getCalendars } from "@/features/calendar/api/calendar.api";
import { EventStatus, type CalendarEvent } from "@/features/calendar/types/calendar.types";
import type { Project, Task } from "@/features/project/types/project";
import type { PomodoroActiveTask } from "../types/pomodoro";
import { defaultFocusStart, scheduleFocusTask } from "../utils/schedule-task";

interface PomodoroTaskPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: PomodoroActiveTask) => void;
}

export function PomodoroTaskPickerDialog({
  isOpen,
  onClose,
  onSelectTask,
}: PomodoroTaskPickerDialogProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [customStart, setCustomStart] = useState(defaultFocusStart);
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [projectError, setProjectError] = useState(false);

  // Load projects on dialog open with graceful offline UI fallback
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    getProjects({ page: 1, limit: 50 })
      .then((res) => {
        if (!mounted) return;
        const projectList = res.data || [];
        setProjectError(false);
        setProjects(projectList);
        setSelectedProjectId(projectList[0]?.id ?? "");
        if (projectList.length === 0) setLoading(false);
      })
      .catch(() => {
        if (mounted) {
          setProjects([]);
          setTasks([]);
          setSelectedProjectId("");
          setProjectError(true);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    Promise.all([getAllCalendarTasks(), getCalendars()])
      .then(([events, calendars]) => {
        if (!mounted) return;
        const today = new Date();
        const projectCalendarIds = new Set(calendars.filter((calendar) => calendar.projectId).map((calendar) => calendar.id));
        setCalendarTasks(events.filter((event) => {
          const start = new Date(event.startAt);
          return event.status !== EventStatus.CANCELLED && !event.completedAt &&
            !event.calendar?.projectId && !projectCalendarIds.has(event.calendarId) &&
            start.getFullYear() === today.getFullYear() &&
            start.getMonth() === today.getMonth() &&
            start.getDate() === today.getDate();
        }));
        setCalendarError(false);
      })
      .catch(() => {
        if (!mounted) return;
        setCalendarTasks([]);
        setCalendarError(true);
      })
      .finally(() => { if (mounted) setCalendarLoading(false); });
    return () => { mounted = false; };
  }, [isOpen]);

  const handlePickCalendarTask = (event: CalendarEvent) => {
    onSelectTask({
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
    onClose();
  };

  // Load tasks when project changes with graceful offline UI fallback
  useEffect(() => {
    if (!selectedProjectId || !isOpen) return;

    let mounted = true;
    getProjectTasks(selectedProjectId)
      .then((taskList) => {
        if (!mounted) return;
        setTasks(taskList ?? []);
      })
      .catch(() => {
        if (mounted) {
          setTasks([]);
          setProjectError(true);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedProjectId, isOpen]);

  const handlePickProjectTask = (task: Task) => {
    const curProject = projects.find((p) => p.id === selectedProjectId);
    const activeTask: PomodoroActiveTask = {
      id: task.id,
      projectId: task.projectId,
      projectName: curProject?.name || "Dự án",
      projectColor: curProject?.color || "#1C4D8D",
      title: task.title,
      priority: task.priority,
      estimatedPomodoros: Math.max(
        1,
        Math.round((task.estimatedMinutes || 25) / 25),
      ),
      completedPomodoros: task.pomodoroSessions
        ? task.pomodoroSessions.filter((s) => s.status === "COMPLETED").length
        : 0,
      checklists: (task.checklists || []).map((c) => ({
        id: c.id,
        title: c.title,
        completed: c.completed,
      })),
    };

    onSelectTask(activeTask);
    onClose();
  };

  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskTitle.trim() || isCreating) return;

    setIsCreating(true);
    setCreateError("");
    let calendarEventId: string;
    try {
      calendarEventId = await scheduleFocusTask(customTaskTitle.trim(), customStart, 2);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Không thể tạo nhiệm vụ trên Calendar.");
      setIsCreating(false);
      return;
    }

    const customTask: PomodoroActiveTask = {
      id: calendarEventId,
      calendarEventId,
      title: customTaskTitle.trim(),
      projectName: "Nhiệm vụ cá nhân",
      projectColor: "#1C4D8D",
      estimatedPomodoros: 2,
      completedPomodoros: 0,
      checklists: [],
    };

    onSelectTask(customTask);
    setCustomTaskTitle("");
    setIsCreating(false);
    onClose();
  };

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      t.status !== "DONE",
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            Chọn nhiệm vụ để tập trung
          </DialogTitle>
        </DialogHeader>

        {/* Quick Add Custom Focus Task */}
        <form onSubmit={handleCreateCustomTask} className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Input
              value={customTaskTitle}
              onChange={(e) => setCustomTaskTitle(e.target.value)}
              placeholder="Hoặc nhập nhanh tên việc cần làm ngay..."
              className="text-xs h-9"
            />
            <Button
              type="submit"
              disabled={!customTaskTitle.trim() || isCreating}
              size="sm"
              className="h-9 px-3 text-xs font-semibold bg-[var(--color-primary,#1C4D8D)] text-white shrink-0"
            >
              <Plus className="size-3.5 mr-1" /> {isCreating ? "Đang tạo..." : "Tạo"}
            </Button>
          </div>
          <label className="block text-[11px] font-semibold text-slate-600">
            Ngày và giờ trên Calendar
            <Input type="datetime-local" required value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="mt-1 text-xs h-9" />
          </label>
          {createError && <p role="alert" className="text-xs text-rose-600">{createError}</p>}
        </form>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold text-slate-700">Task trên Calendar hôm nay</p>
          <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
            {calendarLoading ? <p className="text-xs text-slate-400">Đang tải task Calendar...</p> :
              calendarError ? <p role="alert" className="text-xs text-rose-600">Không tải được task Calendar.</p> :
              calendarTasks.length === 0 ? <p className="text-xs text-slate-400">Hôm nay chưa có task Calendar nào.</p> :
              calendarTasks.map((event) => (
                <button key={event.id} type="button" onClick={() => handlePickCalendarTask(event)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:bg-blue-50">
                  <span className="truncate font-medium text-slate-800">{event.title}</span>
                  <span className="ml-3 shrink-0 text-slate-500">{new Date(event.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                </button>
              ))}
          </div>
        </div>

        <div className="relative my-3 flex items-center">
          <div className="flex-grow border-t border-slate-200" />
          <span className="mx-2 shrink-0 text-[11px] font-semibold text-slate-400 uppercase">
            Hoặc chọn từ Dự án
          </span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        {/* Project Selector Pills */}
        {projects.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {projects.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => { setLoading(true); setSelectedProjectId(proj.id); }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shrink-0 transition-colors ${
                  selectedProjectId === proj.id
                    ? "bg-[var(--color-primary,#1C4D8D)] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: proj.color || "#1C4D8D" }}
                />
                {proj.name}
              </button>
            ))}
          </div>
        )}

        {/* Search Input within project tasks */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm nhiệm vụ..."
            className="pl-8 text-xs h-9"
          />
        </div>

        {/* Task List */}
        <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-xs">Đang tải nhiệm vụ...</span>
            </div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => handlePickProjectTask(t)}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 p-3 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-800 truncate">
                      {t.title}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 text-slate-500 font-normal shrink-0"
                    >
                      {t.status}
                    </Badge>
                  </div>
                  {t.estimatedMinutes > 0 && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Ước lượng: {t.estimatedMinutes} phút (~
                      {Math.ceil(t.estimatedMinutes / 25)} quả 🍅)
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 p-0 rounded-full text-blue-700 hover:bg-blue-100"
                >
                  <Check className="size-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              {projectError ? "Không tải được nhiệm vụ từ máy chủ. Hãy thử lại sau." : "Không tìm thấy nhiệm vụ nào đang mở trong dự án này."}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
