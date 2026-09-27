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
import type { Project, Task } from "@/features/project/types/project";
import type { PomodoroActiveTask } from "../types/pomodoro";

interface PomodoroTaskPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: PomodoroActiveTask) => void;
}

const SAMPLE_PROJECTS: Project[] = [
  {
    id: "proj-kltn",
    name: "Khóa luận tốt nghiệp (KLTN)",
    color: "#1C4D8D",
  } as Project,
  {
    id: "proj-ui",
    name: "Thiết kế Giao diện",
    color: "#0284c7",
  } as Project,
];

const SAMPLE_PROJECT_TASKS: Record<string, Task[]> = {
  "proj-kltn": [
    {
      id: "task-kltn-1",
      projectId: "proj-kltn",
      title: "Nghiên cứu & Thiết kế module Pomodoro Focus Hub",
      status: "IN_PROGRESS",
      priority: "HIGH",
      estimatedMinutes: 50,
      checklists: [
        { id: "c1", title: "Thiết kế giao diện", completed: true },
        { id: "c2", title: "Tối ưu trải nghiệm", completed: false },
      ],
    } as unknown as Task,
    {
      id: "task-kltn-2",
      projectId: "proj-kltn",
      title: "Viết báo cáo chương 3 về Kiến trúc phần mềm",
      status: "TODO",
      priority: "MEDIUM",
      estimatedMinutes: 75,
      checklists: [],
    } as unknown as Task,
  ],
  "proj-ui": [
    {
      id: "task-ui-1",
      projectId: "proj-ui",
      title: "Xây dựng bảng mã màu và phong cách chuẩn Linear",
      status: "IN_PROGRESS",
      priority: "URGENT",
      estimatedMinutes: 25,
      checklists: [],
    } as unknown as Task,
  ],
};

export function PomodoroTaskPickerDialog({
  isOpen,
  onClose,
  onSelectTask,
}: PomodoroTaskPickerDialogProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customTaskTitle, setCustomTaskTitle] = useState("");

  // Load projects on dialog open with graceful offline UI fallback
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);

    getProjects({ page: 1, limit: 50 })
      .then((res) => {
        if (!mounted) return;
        const projectList = res.data || [];
        if (projectList.length > 0) {
          setProjects(projectList);
          setSelectedProjectId(projectList[0].id);
        } else {
          setProjects(SAMPLE_PROJECTS);
          setSelectedProjectId(SAMPLE_PROJECTS[0].id);
        }
      })
      .catch(() => {
        if (mounted) {
          setProjects(SAMPLE_PROJECTS);
          setSelectedProjectId(SAMPLE_PROJECTS[0].id);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Load tasks when project changes with graceful offline UI fallback
  useEffect(() => {
    if (!selectedProjectId || !isOpen) return;

    let mounted = true;
    setLoading(true);

    getProjectTasks(selectedProjectId)
      .then((taskList) => {
        if (!mounted) return;
        if (taskList && taskList.length > 0) {
          setTasks(taskList);
        } else {
          setTasks(SAMPLE_PROJECT_TASKS[selectedProjectId] || []);
        }
      })
      .catch(() => {
        if (mounted) {
          setTasks(SAMPLE_PROJECT_TASKS[selectedProjectId] || []);
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

  const handleCreateCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskTitle.trim()) return;

    const customTask: PomodoroActiveTask = {
      id: `custom-${Date.now()}`,
      title: customTaskTitle.trim(),
      projectName: "Nhiệm vụ cá nhân",
      projectColor: "#1C4D8D",
      estimatedPomodoros: 2,
      completedPomodoros: 0,
      checklists: [],
    };

    onSelectTask(customTask);
    setCustomTaskTitle("");
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
        <form onSubmit={handleCreateCustomTask} className="mt-2 flex gap-2">
          <Input
            value={customTaskTitle}
            onChange={(e) => setCustomTaskTitle(e.target.value)}
            placeholder="Hoặc nhập nhanh tên việc cần làm ngay..."
            className="text-xs h-9"
          />
          <Button
            type="submit"
            disabled={!customTaskTitle.trim()}
            size="sm"
            className="h-9 px-3 text-xs font-semibold bg-[var(--color-primary,#1C4D8D)] text-white shrink-0"
          >
            <Plus className="size-3.5 mr-1" /> Dùng ngay
          </Button>
        </form>

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
                onClick={() => setSelectedProjectId(proj.id)}
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
              Không tìm thấy nhiệm vụ nào đang mở trong dự án này.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
