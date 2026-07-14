"use client";

import { useState, useMemo } from "react";
import { Plus, Search, FolderKanban } from "lucide-react";
import { mockProjects } from "@/lib/mock-data";
import { ProjectStatus } from "@/types/project";
import ProjectCard from "@/components/projects/project-card";
import CreateProjectDialog from "@/components/projects/create-project-dialog";

const FILTER_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: ProjectStatus.ACTIVE, label: "Active" },
  { key: ProjectStatus.ON_HOLD, label: "On Hold" },
  { key: ProjectStatus.COMPLETED, label: "Completed" },
  { key: ProjectStatus.ARCHIVED, label: "Archived" },
] as const;

export default function ProjectsPage() {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filteredProjects = useMemo(() => {
    return mockProjects.filter((p) => {
      const matchesFilter =
        activeFilter === "ALL" || p.status === activeFilter;
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch && !p.archived;
    });
  }, [activeFilter, searchQuery]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[var(--color-secondary)]" strokeWidth={2} />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
              Projects
            </p>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[var(--color-primary-dark)]">
            Quản lý dự án
          </h1>
          <p className="mt-1 max-w-lg text-sm text-slate-500">
            Tổng quan tất cả dự án, theo dõi tiến độ và quản lý công việc hiệu quả.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--color-primary-dark)]/20 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Tạo dự án
        </button>
      </div>

      {/* Filter & Search */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            const count =
              tab.key === "ALL"
                ? mockProjects.filter((p) => !p.archived).length
                : mockProjects.filter(
                    (p) => p.status === tab.key && !p.archived
                  ).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={[
                  "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition",
                  isActive
                    ? "bg-[var(--color-primary-dark)] text-white shadow-md"
                    : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-700",
                ].join(" ")}
              >
                {tab.label}
                <span
                  className={[
                    "grid h-5 min-w-5 place-items-center rounded-md px-1 text-[10px] font-black",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm dự án..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm font-semibold text-[var(--color-primary-dark)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10 sm:w-64"
          />
        </div>
      </div>

      {/* Project Grid */}
      {filteredProjects.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-2xl">
            📭
          </div>
          <p className="mt-4 text-sm font-bold text-slate-600">
            Không tìm thấy dự án nào
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Thử thay đổi bộ lọc hoặc tạo dự án mới.
          </p>
        </div>
      )}

      {/* Create Dialog */}
      <CreateProjectDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </>
  );
}
