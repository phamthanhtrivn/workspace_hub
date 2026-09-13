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
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { Avatar } from "../ui/avatar-stack";

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
  labelId: string;
  icon: typeof LayoutGrid;
}> = [
  { view: "summary", labelId: "project.view.summary", icon: LayoutDashboard },
  { view: "board", labelId: "project.view.board", icon: LayoutGrid },
  { view: "calendar", labelId: "project.view.calendar", icon: Calendar },
  { view: "gantt", labelId: "project.view.gantt", icon: ChartGantt },
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
  const intl = useAppIntl();
  const taskListLabel = intl.formatMessage({ id: "project.view.tasks" });
  const visibleMembers = members.slice(0, 5);
  const remainingMembers = Math.max(0, members.length - visibleMembers.length);

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
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {NAV_ITEMS.slice(0, 2).map(({ view, labelId, icon }) =>
            renderNavItem(view, intl.formatMessage({ id: labelId }), icon),
          )}
          {renderNavItem("list", taskListLabel, List)}
          {NAV_ITEMS.slice(2).map(({ view, labelId, icon }) =>
            renderNavItem(view, intl.formatMessage({ id: labelId }), icon),
          )}
          <div className="my-4 h-px bg-slate-200" />
          <div
            className={[
              "flex items-center rounded px-1 transition",
              viewMode === "members"
                ? "bg-[#DEEBFF] text-[#0747A6]"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => onViewChange("members")}
              className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left text-xs font-semibold"
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {intl.formatMessage(
                  { id: "project.members.count" },
                  { count: members.length },
                )}
              </span>
            </button>
            {canInviteMembers && (
              <button
                type="button"
                onClick={onInviteMembers}
                className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[10px] font-bold text-[#0052CC] transition hover:bg-white/70"
                title={intl.formatMessage({ id: "project.member.invite" })}
              >
                <UserPlus className="h-3 w-3" />
                {intl.formatMessage({ id: "project.member.inviteShort" })}
              </button>
            )}
          </div>
          <div className="mt-1 space-y-1 pl-3 pr-1">
            {visibleMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => onViewChange("members")}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition hover:bg-slate-200/60"
              >
                <Avatar
                  user={{
                    userId: member.userId,
                    displayName: member.displayName,
                    avatarUrl: member.avatarUrl,
                  }}
                  size="xs"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-700">
                    {member.displayName}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {intl.formatMessage({
                      id: member.role === ProjectRole.OWNER
                        ? "project.role.owner"
                        : "project.role.member",
                    })}
                  </span>
                </span>
              </button>
            ))}
            {remainingMembers > 0 && (
              <button
                type="button"
                onClick={() => onViewChange("members")}
                className="w-full rounded px-2 py-1.5 text-left text-[11px] font-bold text-blue-600 transition hover:bg-blue-50"
              >
                {intl.formatMessage(
                  { id: "project.members.more" },
                  { count: remainingMembers },
                )}
              </button>
            )}
          </div>
        </nav>

        <div className="border-t border-slate-200 bg-slate-100/50 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>
              {intl.formatMessage({ id: "project.detail.key" }, { key: projectKey })}
            </span>
            {canOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-slate-400 hover:text-slate-600"
                title={intl.formatMessage({ id: "project.list.settings" })}
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
        title={intl.formatMessage({ id: isCollapsed ? "project.sidebar.expand" : "project.sidebar.collapse" })}
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
