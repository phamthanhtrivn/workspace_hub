"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight, MoreHorizontal, Settings } from "lucide-react";
import { ProjectStatus } from "@/types/project";
import CreateProjectDialog from "@/components/projects/create-project-dialog";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { Avatar } from "@/components/projects/avatar-stack";
import {
  useCreateProject,
  useProjects,
} from "@/features/project/hooks/use-projects";
import type { CreateProjectPayload } from "@/features/project/api/project.api";
import { toast } from "react-toastify";

const FILTER_TABS = [
  { key: "ALL", label: "Tất cả dự án" },
  { key: ProjectStatus.ACTIVE, label: "Đang hoạt động" },
  { key: ProjectStatus.ON_HOLD, label: "Tạm dừng" },
  { key: ProjectStatus.COMPLETED, label: "Hoàn thành" },
] as const;

// Helper to get Project Key (first letter of each word, up to 4 chars)
export function getProjectKey(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4) || "PRJ";
}

export default function ProjectsPage() {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { data: projects = [], isLoading, isError } = useProjects();
  const createProjectMutation = useCreateProject();

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesFilter =
        activeFilter === "ALL"
          ? !p.archived
          : p.status === activeFilter && !p.archived;
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, projects, searchQuery]);

  const handleCreateProject = async (payload: CreateProjectPayload) => {
    try {
      await createProjectMutation.mutateAsync(payload);
      toast.success("Tạo dự án thành công");
      setShowCreate(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo dự án");
      throw error;
    }
  };

  return (
    <div className="flex-1 px-8 py-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumb & Title */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link href="/dashboard" className="hover:text-blue-600 transition">Workspace</Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="text-slate-700">Dự án</span>
      </div>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#172B4D]">Dự án</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý tất cả dự án phần mềm của nhóm, theo dõi tiến độ và cấu hình các cài đặt liên quan.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded bg-[#0052CC] hover:bg-[#0747A6] px-3 py-2 text-sm font-semibold text-white transition duration-150 active:scale-[0.98] focus-visible:outline-none"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Tạo dự án
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={[
                  "relative shrink-0 px-3 py-1.5 text-sm font-medium transition duration-150 pb-2.5",
                  isActive
                    ? "text-[#0052CC] border-b-2 border-[#0052CC]"
                    : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm dự án..."
            className="w-full sm:w-60 rounded border border-slate-300 bg-white py-1.5 pl-8.5 pr-3 text-sm font-medium text-[#172B4D] outline-none transition placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="mt-4 overflow-x-auto rounded border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4.5 animate-pulse bg-white">
                <div className="h-10 w-10 rounded bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-sm font-semibold text-red-500">
            Không thể tải danh sách dự án. Vui lòng kiểm tra lại dịch vụ.
          </div>
        ) : filteredProjects.length > 0 ? (
          <table className="w-full min-w-[850px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Tên dự án</th>
                <th className="px-6 py-3 font-semibold">Mã (Key)</th>
                <th className="px-6 py-3 font-semibold">Loại dự án</th>
                <th className="px-6 py-3 font-semibold">Trưởng dự án</th>
                <th className="px-6 py-3 font-semibold">Trạng thái</th>
                <th className="px-6 py-3 font-semibold w-40">Tiến độ</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProjects.map((project) => {
                const projectKey = getProjectKey(project.name);
                const owner = project.members.find((m) => m.role === "OWNER") || project.members[0];
                const totalTasks = project.tasks?.filter((t) => !t.archived).length || 0;
                const doneTasks = project.tasks?.filter((t) => t.status === "DONE" && !t.archived).length || 0;
                const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                return (
                  <tr key={project.id} className="group hover:bg-[#F4F5F7] transition duration-150">
                    <td className="px-6 py-3.5">
                      <Link href={`/projects/${project.id}`} className="flex items-center gap-3">
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded text-xl shadow-sm border border-slate-200 font-semibold"
                          style={{ backgroundColor: `${project.color}14`, color: project.color }}
                        >
                          {project.icon || "📁"}
                        </span>
                        <div>
                          <span className="font-semibold text-[#0052CC] hover:underline block text-[14px]">
                            {project.name}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">Team-managed software</span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-700">{projectKey}</td>
                    <td className="px-6 py-3.5 text-slate-500 font-medium">Software project</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        {owner ? (
                          <>
                            <Avatar
                              user={{
                                userId: owner.userId,
                                displayName: owner.displayName,
                                avatarUrl: owner.avatarUrl,
                              }}
                              size="xs"
                            />
                            <span className="text-slate-700 font-medium">{owner.displayName}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11px] font-bold text-slate-500">
                          <span>{progress}%</span>
                          <span>{doneTasks}/{totalTasks}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: project.color || "#0052CC",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                        <Link
                          href={`/projects/${project.id}?view=settings`}
                          title="Cài đặt dự án"
                          className="grid h-8 w-8 place-items-center rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                        <button
                          title="Thêm tùy chọn"
                          className="grid h-8 w-8 place-items-center rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-50 text-3xl border border-slate-100">
              📂
            </div>
            <p className="mt-4 text-sm font-bold text-slate-700">Không tìm thấy dự án nào</p>
            <p className="mt-1 text-xs text-slate-400">Hãy thay đổi bộ lọc hoặc tạo một dự án mới để bắt đầu.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded bg-[#0052CC] hover:bg-[#0747A6] px-3.5 py-2 text-xs font-semibold text-white transition"
            >
              Tạo dự án mới
            </button>
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateProject}
        isSubmitting={createProjectMutation.isPending}
      />
    </div>
  );
}
