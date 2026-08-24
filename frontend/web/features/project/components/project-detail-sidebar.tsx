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
import { ProjectTypeBadge } from "./project-type-badge";
import type { Project, ProjectMember } from "../types/project";

export type ProjectViewMode =
  | "summary"
  | "board"
  | "list"
  | "calendar"
  | "gantt"
  | "members";

interface ProjectDetailSidebarProps {
  project: Project;
  members: ProjectMember[];
  projectKey: string;
  viewMode: ProjectViewMode;
  isCollapsed: boolean;
  canManageProject: boolean;
  onViewChange: (view: ProjectViewMode) => void;
  onToggle: () => void;
  onOpenSettings: () => void;
}

const NAV_ITEMS: Array<{
  view: ProjectViewMode;
  label: string;
  icon: typeof LayoutGrid;
}> = [
  { view: "summary", label: "Summary", icon: LayoutDashboard },
  { view: "board", label: "Kanban Board", icon: LayoutGrid },
  { view: "calendar", label: "Lịch trình (Calendar)", icon: Calendar },
  { view: "gantt", label: "Gantt chart", icon: ChartGantt },
];

export default function ProjectDetailSidebar({
  project,
  members,
  projectKey,
  viewMode,
  isCollapsed,
  canManageProject,
  onViewChange,
  onToggle,
  onOpenSettings,
}: ProjectDetailSidebarProps) {
  const taskListLabel =
    project.projectType === "SOFTWARE_DEVELOPMENT" ? "Backlog" : "Công việc";

  const renderNavItem = (
    view: ProjectViewMode,
    label: string,
    Icon: typeof LayoutGrid,
  ) => (
    <button
      key={view}
      type="button"
      onClick={() => onViewChange(view)}
      className={[
        "flex w-full items-center gap-3 rounded px-3 py-2 text-xs font-semibold transition",
        viewMode === view
          ? "bg-[#DEEBFF] text-[#0747A6]"
          : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
      ].join(" ")}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <aside
        className={[
          "relative flex select-none flex-col border-r border-slate-200 bg-[#F4F5F7] transition-all duration-300",
          isCollapsed ? "w-0 overflow-hidden" : "w-60 shrink-0",
        ].join(" ")}
      >
        <div className="flex items-center gap-2.5 border-b border-slate-200 p-4">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded border border-slate-200 bg-white text-lg font-bold"
            style={{ color: project.color }}
          >
            {project.icon || "📁"}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#172B4D]">
              {project.name}
            </h2>
            <div className="mt-1">
              <ProjectTypeBadge type={project.projectType} compact />
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {NAV_ITEMS.slice(0, 2).map(({ view, label, icon }) =>
            renderNavItem(view, label, icon),
          )}
          {renderNavItem("list", taskListLabel, List)}
          {NAV_ITEMS.slice(2).map(({ view, label, icon }) =>
            renderNavItem(view, label, icon),
          )}
          <div className="my-4 h-px bg-slate-200" />
          {renderNavItem("members", `Thành viên (${members.length})`, Users)}
        </nav>

        <div className="border-t border-slate-200 bg-slate-100/50 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>
              Mã dự án: <strong>{projectKey}</strong>
            </span>
            {canManageProject && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-slate-400 hover:text-slate-600"
                title="Cài đặt Project"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      <button
        type="button"
        onClick={onToggle}
        className="group relative z-30 -ml-1 flex w-3 items-center justify-center border-r border-slate-200 transition-colors hover:bg-slate-200"
        title={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
      >
        <div className="absolute left-1/2 top-16 -translate-x-1/2 cursor-pointer rounded-full border border-slate-200 bg-white p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-slate-500" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-slate-500" />
          )}
        </div>
      </button>
    </>
  );
}
