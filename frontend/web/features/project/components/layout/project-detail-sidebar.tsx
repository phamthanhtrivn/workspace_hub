import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Route,
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
  | "documents"
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
    { view: "list", label: "Backlog", icon: ListTodo },
    { view: "calendar", label: "Schedule", icon: CalendarClock },
    { view: "gantt", label: "Gantt chart", icon: Route },
    { view: "documents", label: "Documents", icon: FileText },
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
          "group h-12 w-full justify-start gap-3 rounded-control px-2.5 text-sm font-semibold transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          isCollapsed && "lg:justify-center lg:px-2",
        )}
      >
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors",
            active
              ? "bg-overlay/10"
              : "bg-muted text-muted-foreground group-hover:bg-card group-hover:text-info",
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
          "fixed inset-0 z-40 h-auto w-auto rounded-none bg-overlay/30 p-0 transition-opacity hover:bg-overlay/30 lg:hidden",
          isMobileOpen
            ? "visible pointer-events-auto opacity-100"
            : "invisible pointer-events-none opacity-0",
        )}
      />

      <aside
        aria-label="Project navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[calc(100vw-3rem)] shrink-0 flex-col border-r border-border bg-card transition-[width,transform,visibility] duration-200 ease-in-out shadow-dialog",
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
          className="absolute -right-4 top-8 z-30 hidden h-8 w-8 rounded-full border-border bg-card text-muted-foreground hover:bg-background hover:text-info focus-visible:ring-2 focus-visible:ring-ring lg:flex shadow-panel"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-border px-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border bg-background text-lg font-semibold"
            style={{ borderColor: project.color, color: "var(--foreground)" }}
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
            <h2 className="truncate text-sm font-semibold text-foreground">
              {project.name}
            </h2>
            {projectIdSuffix ? (
              <p
                className="mt-0.5 truncate font-mono text-xs font-semibold text-muted-foreground"
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
            className="ml-auto h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 py-3">
          <div className="shrink-0 space-y-1">
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

          <div className="my-3 h-px shrink-0 bg-muted" />

          <section
            className="flex shrink-0 flex-col"
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
                    "group h-12 min-w-0 flex-1 justify-start gap-3 rounded-control px-2.5 text-sm font-semibold transition-colors",
                    membersActive
                      ? "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isCollapsed &&
                    "lg:w-full lg:flex-none lg:justify-center lg:px-2",
                  )}
                >
                  <span
                    className={cn(
                      "relative grid h-8 w-8 shrink-0 place-items-center rounded-md",
                      membersActive
                        ? "bg-overlay/10"
                        : "bg-muted text-muted-foreground group-hover:bg-card group-hover:text-info",
                    )}
                  >
                    <Users className="h-[18px] w-[18px]" strokeWidth={2} />
                    {isCollapsed ? (
                      <span className="absolute -right-2 -top-2 hidden min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold leading-5 text-primary-foreground ring-2 ring-border lg:inline-flex">
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
                        "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                        membersActive
                          ? "bg-overlay/10 text-primary-foreground"
                          : "bg-muted text-muted-foreground",
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
                      "h-9 text-info hover:bg-info-soft hover:text-info",
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
                "mt-1 space-y-1 px-1 pb-2",
                isCollapsed && "lg:hidden",
              )}
            >
              {visibleMembers.map((member) => (
                <Button
                  key={member.id}
                  type="button"
                  variant="ghost"
                  onClick={() => onViewChange("members")}
                  className="h-auto w-full justify-start gap-2.5 rounded-control px-2 py-2 font-normal hover:bg-background"
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
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {member.displayName}
                    </span>
                    <span className="block text-xs font-medium text-muted-foreground">
                      {member.role === ProjectRole.ADMIN ? "Owner" : "Member"}
                    </span>
                  </span>
                </Button>
              ))}

              {remainingMembers > 0 ? (
                <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  +{remainingMembers} more members
                </p>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                onClick={() => onViewChange("members")}
                className="h-9 w-full justify-between rounded-control px-2 text-xs font-semibold text-info hover:bg-info-soft hover:text-info"
              >
                <span>View all members</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </nav>

        <footer className="mt-auto shrink-0 border-t border-border p-2">
          <div className="space-y-1">
            {canOpenSettings ? (
              <SidebarTooltip label="Project settings" enabled={isCollapsed}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onOpenSettings}
                  className={cn(
                    "group h-12 w-full justify-start gap-3 rounded-control px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground",
                    isCollapsed && "lg:justify-center lg:px-2",
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground group-hover:bg-card group-hover:text-info">
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
                  "group h-12 w-full justify-start gap-3 rounded-control px-2.5 text-destructive hover:bg-destructive-soft hover:text-destructive",
                  isCollapsed && "lg:justify-center lg:px-2",
                )}
              >
                <Link href="/projects" aria-label="Exit project">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-destructive-soft text-destructive group-hover:bg-card group-hover:text-destructive">
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
