"use client";

import {
  Calendar,
  ChartGantt,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LayoutGrid,
  List,
  Settings,
  Users,
} from "lucide-react";
import { ProjectType, type Project, type ProjectMember } from "@/features/project/types/project";
import { ProjectTypeBadge } from "../shared/project-type-badge";
import { DEFAULT_PROJECT_ICON } from "@/features/project/constants/project.constants";

export type ProjectViewMode = "summary" | "board" | "list" | "calendar" | "gantt" | "members";

interface ProjectSidebarProps {
  project: Project;
  members: ProjectMember[];
  projectKey: string;
  viewMode: ProjectViewMode;
  isCollapsed: boolean;
  onViewModeChange: (viewMode: ProjectViewMode) => void;
  onToggleCollapsed: () => void;
  onOpenSettings: () => void;
}

const navigation = [
  { mode: "summary" as const, label: "Summary", icon: LayoutDashboard },
  { mode: "board" as const, label: "Kanban Board", icon: LayoutGrid },
  { mode: "list" as const, label: "Backlog", icon: List },
  { mode: "calendar" as const, label: "Calendar", icon: Calendar },
  { mode: "gantt" as const, label: "Gantt chart", icon: ChartGantt },
];

export default function ProjectSidebar({
  project,
  members,
  projectKey,
  viewMode,
  isCollapsed,
  onViewModeChange,
  onToggleCollapsed,
  onOpenSettings,
}: ProjectSidebarProps) {
  const isSoftwareProject = project.projectType === ProjectType.SOFTWARE_DEVELOPMENT;

  return (
    <>
      <aside
        className={[
          "flex flex-col border-r border-slate-200 bg-[#F4F5F7] transition-all duration-300 relative select-none",
          isCollapsed ? "w-0 overflow-hidden" : "w-60 shrink-0",
        ].join(" ")}
      >
        <div className="p-4 flex items-center gap-2.5 border-b border-slate-200">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded bg-white text-lg border border-slate-200 font-bold"
            style={{ color: project.color }}
          >
          {project.icon || DEFAULT_PROJECT_ICON}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#172B4D]">{project.name}</h2>
            <div className="mt-1"><ProjectTypeBadge type={project.projectType} compact /></div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navigation.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={[
                "w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded transition",
                viewMode === mode
                  ? "bg-[#DEEBFF] text-[#0747A6]"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{mode === "list" && !isSoftwareProject ? "Công việc" : label}</span>
            </button>
          ))}

          <div className="h-px bg-slate-200 my-4" />
          <button
            onClick={() => onViewModeChange("members")}
            className={[
              "w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded transition",
              viewMode === "members"
                ? "bg-[#DEEBFF] text-[#0747A6]"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
            ].join(" ")}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Thành viên ({members.length})</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-slate-100/50">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Mã dự án: <strong>{projectKey}</strong></span>
            <button onClick={onOpenSettings} className="text-slate-400 hover:text-slate-600" title="Cài đặt Project">
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <button
        onClick={onToggleCollapsed}
        className="relative z-30 w-3 -ml-1 flex items-center justify-center hover:bg-slate-200 group border-r border-slate-200 transition-colors"
        title={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
      >
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white rounded-full border border-slate-200 shadow-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          {isCollapsed ? <ChevronRight className="h-3 w-3 text-slate-500" /> : <ChevronLeft className="h-3 w-3 text-slate-500" />}
        </div>
      </button>
    </>
  );
}
