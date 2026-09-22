import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChartGantt,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LayoutGrid,
  List,
  Settings,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  ProjectRole,
  type Project,
  type ProjectMember,
} from "@/features/project/types/project";
import { Avatar } from "../ui/avatar-stack";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProjectIdSuffix } from "@/features/project/utils/project-id.utils";
import { cn } from "@/lib/utils";

export type ProjectViewMode =
  | "overview"
  | "board"
  | "list"
  | "calendar"
  | "gantt"
  | "members";

interface ProjectDetailSidebarProps {
  project: Project;
  members: ProjectMember[];
  viewMode: ProjectViewMode;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  canOpenSettings: boolean;
  canInviteMembers?: boolean;
  onViewChange: (view: ProjectViewMode) => void;
  onToggle: () => void;
  onMobileClose: () => void;
  onOpenSettings: () => void;
  onInviteMembers?: () => void;
}

interface SidebarTooltipProps {
  label: string;
  enabled: boolean;
  className?: string;
  children: ReactNode;
}

interface SidebarNavItemProps {
  view: ProjectViewMode;
  label: string;
  icon: LucideIcon;
  active: boolean;
  isCollapsed: boolean;
  onSelect: (view: ProjectViewMode) => void;
}

const NAV_ITEMS: Array<{
  view: ProjectViewMode;
  label: string;
  icon: LucideIcon;
}> = [
    { view: "overview", label: "Overview", icon: LayoutDashboard },
    { view: "board", label: "Kanban Board", icon: LayoutGrid },
    { view: "list", label: "List View", icon: List },
    { view: "calendar", label: "Calendar", icon: Calendar },
    { view: "gantt", label: "Timeline", icon: ChartGantt },
  ];

function SidebarTooltip({
  label,
  enabled,
  className,
  children,
}: SidebarTooltipProps) {
  return (
    <div className={cn("w-full [&>span]:w-full", className)}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        {enabled ? (
          <TooltipContent className="bottom-auto left-full top-1/2 mb-0 ml-2 -translate-x-0 -translate-y-1/2 max-lg:!hidden">
            {label}
          </TooltipContent>
        ) : null}
      </Tooltip>
    </div>
  );
}

function SidebarNavItem({
  view,
  label,
  icon: Icon,
  active,
  isCollapsed,
  onSelect,
}: SidebarNavItemProps) {
  return (
    <SidebarTooltip label={label} enabled={isCollapsed}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onSelect(view)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group h-12 w-full justify-start gap-3 rounded-lg px-2.5 text-sm font-semibold transition-colors",
          "focus-visible:ring-2 focus-visible:ring-[#0052CC]/35",
          active
            ? "bg-[#0052CC] text-white hover:bg-[#0747A6] hover:text-white"
            : "text-slate-600 hover:bg-slate-100 hover:text-[#172B4D]",
          isCollapsed && "lg:justify-center lg:px-2",
        )}
      >
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors",
            active
              ? "bg-white/15"
              : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-[#0052CC]",
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 overflow-hidden text-left opacity-100 transition-[width,opacity] duration-200",
            isCollapsed && "lg:w-0 lg:flex-none lg:opacity-0",
          )}
        >
          {label}
        </span>
      </Button>
    </SidebarTooltip>
  );
}

export default function ProjectDetailSidebar({
  project,
  members,
  viewMode,
  isCollapsed,
  isMobileOpen,
  canOpenSettings,
  canInviteMembers = false,
  onViewChange,
  onToggle,
  onMobileClose,
  onOpenSettings,
  onInviteMembers,
}: ProjectDetailSidebarProps) {
  const visibleMembers = members.slice(0, 5);
  const remainingMembers = Math.max(0, members.length - visibleMembers.length);
  const membersActive = viewMode === "members";
  const projectIdSuffix = getProjectIdSuffix(project.id);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={onMobileClose}
        tabIndex={isMobileOpen ? 0 : -1}
        aria-label="Close project navigation overlay"
        aria-hidden={!isMobileOpen}
        className={cn(
          "fixed inset-0 z-40 h-auto w-auto rounded-none bg-slate-950/30 p-0 backdrop-blur-[1px] transition-opacity hover:bg-slate-950/30 lg:hidden",
          isMobileOpen
            ? "visible pointer-events-auto opacity-100"
            : "invisible pointer-events-none opacity-0",
        )}
      />

      <aside
        aria-label="Project navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[calc(100vw-3rem)] shrink-0 flex-col border-r border-slate-200/80 bg-white shadow-[18px_0_48px_rgba(15,40,84,0.08)] transition-[width,transform,visibility] duration-300 ease-in-out",
          "lg:relative lg:inset-auto lg:z-20 lg:h-full lg:max-w-none lg:translate-x-0 lg:visible",
          isMobileOpen
            ? "visible translate-x-0"
            : "invisible -translate-x-full",
          isCollapsed ? "lg:w-20" : "lg:w-62",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onToggle}
          aria-label={
            isCollapsed ? "Expand project sidebar" : "Collapse project sidebar"
          }
          aria-expanded={!isCollapsed}
          className="absolute -right-4 top-8 z-30 hidden h-8 w-8 rounded-full border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/35 lg:flex"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-slate-100 px-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold shadow-sm"
            style={{ color: project.color }}
            aria-hidden="true"
          >
            {project.icon ? (
              project.icon
            ) : (
              <FolderKanban className="h-5 w-5" strokeWidth={2} />
            )}
          </span>
          <div
            className={cn(
              "min-w-0 flex-1 overflow-hidden opacity-100 transition-[width,opacity] duration-200",
              isCollapsed && "lg:w-0 lg:flex-none lg:opacity-0",
            )}
          >
            <h2 className="truncate text-sm font-bold text-[#172B4D]">
              {project.name}
            </h2>
            {projectIdSuffix ? (
              <p
                className="mt-0.5 truncate font-mono text-[11px] font-semibold text-slate-500"
                title={`Project ID: ${project.id}`}
              >
                {projectIdSuffix}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMobileClose}
            aria-label="Close project navigation"
            className="ml-auto h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <nav className="flex min-h-0 flex-1 flex-col px-2 py-3">
          <div className="space-y-1">
            {NAV_ITEMS.map(({ view, label, icon }) => (
              <SidebarNavItem
                key={view}
                view={view}
                label={label}
                icon={icon}
                active={viewMode === view}
                isCollapsed={isCollapsed}
                onSelect={onViewChange}
              />
            ))}
          </div>

          <div className="my-3 h-px shrink-0 bg-slate-100" />

          <section
            className="flex min-h-0 flex-1 flex-col"
            aria-label="Project members"
          >
            <div
              className={cn(
                "flex items-center justify-between gap-2",
                isCollapsed && "lg:flex-col",
              )}
            >
              <SidebarTooltip
                label="Members"
                enabled={isCollapsed}
                className="min-w-0 flex-1"
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onViewChange("members")}
                  aria-current={membersActive ? "page" : undefined}
                  className={cn(
                    "group h-12 min-w-0 flex-1 justify-start gap-3 rounded-lg px-2.5 text-sm font-semibold transition-colors",
                    membersActive
                      ? "bg-[#0052CC] text-white hover:bg-[#0747A6] hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-[#172B4D]",
                    isCollapsed &&
                    "lg:w-full lg:flex-none lg:justify-center lg:px-2",
                  )}
                >
                  <span
                    className={cn(
                      "relative grid h-8 w-8 shrink-0 place-items-center rounded-md",
                      membersActive
                        ? "bg-white/15"
                        : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-[#0052CC]",
                    )}
                  >
                    <Users className="h-[18px] w-[18px]" strokeWidth={2} />
                    {isCollapsed ? (
                      <span className="absolute -right-2 -top-2 hidden min-w-5 items-center justify-center rounded-full bg-[#0052CC] px-1 text-[9px] font-bold leading-5 text-white ring-2 ring-white lg:inline-flex">
                        {members.length > 99 ? "99+" : members.length}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-start gap-2 overflow-hidden text-left opacity-100 transition-[width,opacity] duration-200",
                      isCollapsed && "lg:w-0 lg:flex-none lg:opacity-0",
                    )}
                  >
                    <span>Members</span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                        membersActive
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {members.length}
                    </span>
                  </span>
                </Button>
              </SidebarTooltip>

              {canInviteMembers && onInviteMembers ? (
                <SidebarTooltip
                  label="Invite member"
                  enabled={isCollapsed}
                  className="w-auto shrink-0 [&>span]:w-auto"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onInviteMembers}
                    aria-label="Invite member"
                    className={cn(
                      "h-9 text-[#0052CC] hover:bg-blue-50 hover:text-[#0747A6]",
                      isCollapsed ? "lg:w-full" : "w-9",
                    )}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </SidebarTooltip>
              ) : null}
            </div>

            <div
              className={cn(
                "mt-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-2",
                isCollapsed && "lg:hidden",
              )}
            >
              {visibleMembers.map((member) => (
                <Button
                  key={member.id}
                  type="button"
                  variant="ghost"
                  onClick={() => onViewChange("members")}
                  className="h-auto w-full justify-start gap-2.5 rounded-lg px-2 py-2 font-normal hover:bg-slate-50"
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
                    <span className="block text-[10px] font-medium text-slate-400">
                      {member.role === ProjectRole.ADMIN ? "Owner" : "Member"}
                    </span>
                  </span>
                </Button>
              ))}

              {remainingMembers > 0 ? (
                <p className="px-2 py-1 text-[11px] font-semibold text-slate-400">
                  +{remainingMembers} more members
                </p>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                onClick={() => onViewChange("members")}
                className="h-9 w-full justify-between rounded-lg px-2 text-xs font-semibold text-[#0052CC] hover:bg-blue-50 hover:text-[#0747A6]"
              >
                <span>View all members</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </nav>

        <footer className="mt-auto shrink-0 border-t border-slate-100 p-2">
          <div className="space-y-1">
            {canOpenSettings ? (
              <SidebarTooltip label="Project settings" enabled={isCollapsed}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onOpenSettings}
                  className={cn(
                    "group h-12 w-full justify-start gap-3 rounded-lg px-2.5 text-slate-600 hover:bg-slate-100 hover:text-[#172B4D]",
                    isCollapsed && "lg:justify-center lg:px-2",
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-[#0052CC]">
                    <Settings
                      className="h-[18px] w-[18px]"
                      strokeWidth={2}
                    />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 overflow-hidden text-left opacity-100 transition-[width,opacity] duration-200",
                      isCollapsed && "lg:w-0 lg:flex-none lg:opacity-0",
                    )}
                  >
                    <span className="block truncate text-sm font-semibold">
                      Project settings
                    </span>
                  </span>
                </Button>
              </SidebarTooltip>
            ) : null}

            <SidebarTooltip label="Exit project" enabled={isCollapsed}>
              <Button
                asChild
                variant="ghost"
                className={cn(
                  "group h-12 w-full justify-start gap-3 rounded-lg px-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700",
                  isCollapsed && "lg:justify-center lg:px-2",
                )}
              >
                <Link href="/projects" aria-label="Exit project">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-rose-50 text-rose-500 group-hover:bg-white group-hover:text-rose-600">
                    <ArrowLeft
                      className="h-[18px] w-[18px]"
                      strokeWidth={2}
                    />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 overflow-hidden text-left opacity-100 transition-[width,opacity] duration-200",
                      isCollapsed && "lg:w-0 lg:flex-none lg:opacity-0",
                    )}
                  >
                    <span className="block truncate text-sm font-semibold">
                      Exit project
                    </span>
                  </span>
                </Link>
              </Button>
            </SidebarTooltip>
          </div>
        </footer>
      </aside>
    </>
  );
}
