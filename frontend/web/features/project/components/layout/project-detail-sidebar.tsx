import {
  Calendar,
  ChartGantt,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LayoutGrid,
  List,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import {
  ProjectRole,
  type Project,
  type ProjectMember,
} from "@/features/project/types/project";
import { Avatar } from "../ui/avatar-stack";

import { Button } from "@/components/ui/button";

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
  canOpenSettings: boolean;
  canInviteMembers?: boolean;
  onViewChange: (view: ProjectViewMode) => void;
  onToggle: () => void;
  onOpenSettings: () => void;
  onInviteMembers?: () => void;
}

const NAV_ITEMS: Array<{
  view: ProjectViewMode;
  label: string;
  icon: typeof LayoutGrid;
}> = [
  { view: "summary", label: "Summary", icon: LayoutDashboard },
  { view: "board", label: "Board", icon: LayoutGrid },
  { view: "calendar", label: "Calendar", icon: Calendar },
  { view: "gantt", label: "Timeline", icon: ChartGantt },
];

export default function ProjectDetailSidebar({
  project,
  members,
  projectKey,
  viewMode,
  isCollapsed,
  canOpenSettings,
  canInviteMembers = false,
  onViewChange,
  onToggle,
  onOpenSettings,
  onInviteMembers,
}: ProjectDetailSidebarProps) {
  const visibleMembers = members.slice(0, 5);
  const remainingMembers = Math.max(0, members.length - visibleMembers.length);

  const renderNavItem = (
    view: ProjectViewMode,
    label: string,
    Icon: typeof LayoutGrid,
  ) => (
    <Button
      key={view}
      type="button"
      variant="ghost"
      onClick={() => onViewChange(view)}
      className={[
        "flex w-full justify-start h-8 items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer",
        viewMode === view
          ? "bg-[#DEEBFF] text-[#0747A6] hover:bg-[#DEEBFF] hover:text-[#0747A6]"
          : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
      ].join(" ")}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Button>
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
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-lg font-bold shadow-2xs"
            style={{ color: project.color }}
          >
            {project.icon || "📁"}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-[#172B4D]">
              {project.name}
            </h2>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {NAV_ITEMS.slice(0, 2).map(({ view, label, icon }) =>
            renderNavItem(view, label, icon),
          )}
          {renderNavItem("list", "List View", List)}
          {NAV_ITEMS.slice(2).map(({ view, label, icon }) =>
            renderNavItem(view, label, icon),
          )}
          <div className="my-4 h-px bg-slate-200" />
          <div
            className={[
              "flex items-center rounded-lg px-1 transition",
              viewMode === "members"
                ? "bg-[#DEEBFF] text-[#0747A6]"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
            ].join(" ")}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => onViewChange("members")}
              className="flex h-8 min-w-0 flex-1 justify-start items-center gap-3 px-2 py-2 text-left text-xs font-semibold cursor-pointer hover:bg-transparent"
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Members ({members.length})
              </span>
            </Button>
            {canInviteMembers && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onInviteMembers}
                className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-[#0052CC] hover:bg-white/70 hover:text-[#0052CC] cursor-pointer"
                title="Invite member"
              >
                <UserPlus className="h-3 w-3" />
                Invite
              </Button>
            )}
          </div>
          <div className="mt-1 space-y-1 pl-3 pr-1">
            {visibleMembers.map((member) => (
              <Button
                key={member.id}
                type="button"
                variant="ghost"
                onClick={() => onViewChange("members")}
                className="flex h-auto w-full justify-start items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-200/60 cursor-pointer font-normal"
              >
                <Avatar
                  user={{
                    userId: member.userId,
                    displayName: member.displayName,
                    avatarUrl: member.avatarUrl,
                  }}
                  size="xs"
                />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xs font-semibold text-slate-700">
                    {member.displayName}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {member.role === ProjectRole.ADMIN ? "Owner" : "Member"}
                  </span>
                </span>
              </Button>
            ))}
            {remainingMembers > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onViewChange("members")}
                className="h-7 w-full justify-start rounded-lg px-2 py-1 text-left text-[11px] font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
              >
                +{remainingMembers} more
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onViewChange("members")}
              className={[
                "mt-1 flex h-7 w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition cursor-pointer",
                viewMode === "members"
                  ? "bg-[#DEEBFF] text-[#0747A6] hover:bg-[#DEEBFF] hover:text-[#0747A6]"
                  : "text-[#0052CC] hover:bg-slate-200/60 hover:text-[#0052CC]",
              ].join(" ")}
            >
              <span>View all members</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </div>
        </nav>

        <div className="border-t border-slate-200 bg-slate-100/50 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Key: {projectKey}</span>
            {canOpenSettings && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onOpenSettings}
                className="h-6 w-6 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Project Settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className="group relative z-30 -ml-1 flex h-auto w-3 items-center justify-center rounded-none border-r border-slate-200 p-0 transition-colors hover:bg-slate-200 cursor-pointer"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="absolute left-1/2 top-16 -translate-x-1/2 cursor-pointer rounded-full border border-slate-200 bg-white p-0.5 opacity-0 shadow-xs transition-opacity group-hover:opacity-100">
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-slate-500" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-slate-500" />
          )}
        </div>
      </Button>
    </>
  );
}
