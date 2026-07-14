"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProjectById } from "@/lib/mock-data";
import { type Task, TaskStatus } from "@/types/project";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { AvatarStack } from "@/components/projects/avatar-stack";
import BoardView from "@/components/projects/board-view";
import ListView from "@/components/projects/list-view";
import TaskDetailDrawer from "@/components/projects/task-detail-drawer";
import ProjectMembersPanel from "@/components/projects/project-members-panel";
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Calendar,
  Plus,
  Settings,
  Filter,
  Search,
  Users,
} from "lucide-react";

type ViewMode = "board" | "list" | "calendar";

const VIEW_TABS: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: "board", label: "Board", icon: LayoutGrid },
  { key: "list", label: "List", icon: List },
  { key: "calendar", label: "Calendar", icon: Calendar },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const project = getProjectById(projectId);

  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [tasks, setTasks] = useState<Task[]>(project?.tasks || []);

  useEffect(() => {
    if (project) {
      setTasks(project.tasks);
    }
  }, [project]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-2xl">
          📭
        </div>
        <p className="mt-4 text-sm font-bold text-slate-600">
          Không tìm thấy dự án
        </p>
        <Link
          href="/projects"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-secondary)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery) return true;
    return t.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  return (
    <>
      {/* ── Project Header ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          {/* Back link */}
          <Link
            href="/projects"
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Link>

          {/* Icon + Info */}
          <div className="flex items-center gap-3">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl shadow-sm ring-1 ring-slate-200"
              style={{ backgroundColor: `${project.color}14` }}
            >
              {project.icon}
            </span>
            <div>
              <h1 className="text-xl font-black text-[var(--color-primary-dark)]">
                {project.name}
              </h1>
              <div className="mt-1 flex items-center gap-3">
                <ProjectStatusBadge status={project.status} />
                <span className="text-xs font-semibold text-slate-400">
                  {tasks.filter((t) => !t.archived).length} tasks
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Members */}
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <AvatarStack
              users={project.members.map((m) => ({
                userId: m.userId,
                displayName: m.displayName,
                avatarUrl: m.avatarUrl,
              }))}
              max={3}
              size="xs"
            />
            <Users className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
          </button>

          {/* Settings */}
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </button>

          {/* Add task */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[var(--color-primary-dark)]/20 transition hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Tạo task
          </button>
        </div>
      </div>

      {/* ── Toolbar: View tabs + Search ── */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* View mode tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition",
                  isActive
                    ? "bg-white text-[var(--color-primary-dark)] shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm task..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8.5 pr-3 text-xs font-semibold text-[var(--color-primary-dark)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10 sm:w-52"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <Filter className="h-3.5 w-3.5" strokeWidth={2} />
            Filter
          </button>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="mt-5 flex gap-5">
        {/* Main content */}
        <div className="min-w-0 flex-1">
          {viewMode === "board" && (
            <BoardView
              tasks={filteredTasks}
              onTaskClick={(task) => setSelectedTask(task)}
              onTaskMove={handleTaskMove}
            />
          )}
          {viewMode === "list" && (
            <ListView
              tasks={filteredTasks}
              onTaskClick={(task) => setSelectedTask(task)}
            />
          )}
          {viewMode === "calendar" && (
            <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-24 text-sm font-semibold text-slate-400">
              📅 Calendar view sẽ được phát triển trong phiên bản tiếp theo
            </div>
          )}
        </div>

        {/* Members sidebar (collapsible) */}
        {showMembers && (
          <div className="hidden w-72 shrink-0 lg:block">
            <ProjectMembersPanel members={project.members} />
          </div>
        )}
      </div>

      {/* ── Task detail drawer ── */}
      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </>
  );
}
