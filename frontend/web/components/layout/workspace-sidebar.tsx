"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Settings, X } from "lucide-react";
import { WorkspaceLogo } from "@/components/common/workspace-logo";
import { Button } from "@/components/ui/button";
import { SheetPanel } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  isWorkspaceRouteActive,
  WORKSPACE_NAVIGATION_ITEMS,
} from "./workspace-navigation";
import {
  useWorkspaceSidebarBadges,
  type WorkspaceBadgeTone,
  type WorkspaceNavBadge,
} from "./use-workspace-sidebar-badges";

interface WorkspaceSidebarProps {
  pathname: string;
  email: string | null;
  desktop: boolean;
  mobileOpen: boolean;
  collapsed: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

function getBadgeToneClasses(
  tone: WorkspaceBadgeTone,
  active: boolean,
): string {
  if (active) {
    if (tone === "success") return "bg-success text-primary-foreground";
    if (tone === "warning") return "bg-warning text-primary-foreground";
    if (tone === "danger") return "bg-destructive text-destructive-foreground";

    return "bg-primary text-primary-foreground";
  }

  switch (tone) {
    case "urgent":
      return "bg-primary text-primary-foreground";
    case "info":
      return "border border-info-outline/40 bg-info-soft text-info-content";
    case "success":
      return "border border-success/25 bg-success-soft text-success-content";
    case "warning":
      return "border border-warning/30 bg-warning-soft text-warning-content";
    case "danger":
      return "border border-destructive/30 bg-destructive-soft text-destructive-content";
    case "neutral":
    default:
      return "border border-border bg-muted text-muted-foreground";
  }
}

function getCollapsedMicroBadgeClasses(tone: WorkspaceBadgeTone): string {
  switch (tone) {
    case "urgent":
      return "bg-primary text-primary-foreground";
    case "success":
      return "bg-success text-primary-foreground";
    case "warning":
      return "bg-warning text-primary-foreground";
    case "danger":
      return "bg-destructive text-destructive-foreground";
    case "info":
    case "neutral":
    default:
      return "bg-info-content text-primary-foreground";
  }
}

export function WorkspaceSidebar({
  pathname,
  email,
  desktop,
  mobileOpen,
  collapsed,
  onClose,
  onOpenSettings,
}: WorkspaceSidebarProps) {
  const badges = useWorkspaceSidebarBadges();
  const [pomodoroBadgeOverride, setPomodoroBadgeOverride] = useState<
    "auto" | "progress" | "live"
  >("auto");
  const labelClassName = cn("min-w-0 flex-1", collapsed && "lg:hidden");

  const resolvePomodoroBadge = (
    badge: WorkspaceNavBadge,
  ): WorkspaceNavBadge => {
    if (!badge.isPomodoro || pomodoroBadgeOverride === "auto") return badge;
    const showLive = pomodoroBadgeOverride === "live";

    return {
      ...badge,
      text: showLive
        ? (badge.pomodoroLiveText ?? badge.text)
        : (badge.pomodoroProgressText ?? badge.text),
      compactText: showLive ? "●" : (badge.pomodoroProgressText ?? badge.text),
      tone: showLive ? "success" : "info",
      pulse: showLive,
    };
  };

  return (
    <SheetPanel
      id="workspace-navigation"
      aria-label="Workspace navigation"
      open={desktop || mobileOpen}
      modal={!desktop}
      onClose={onClose}
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[280px] shrink-0 flex-col border-r border-border bg-sidebar px-3 py-4 shadow-dialog outline-none transition-[width,transform] duration-200 ease-in-out motion-reduce:transition-none lg:relative lg:flex",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "lg:w-[68px] lg:px-2" : "lg:w-[280px]",
      )}
    >
      <div
        className={cn(
          "flex items-center px-1 pb-4 pt-1",
          collapsed ? "lg:justify-center" : "justify-between gap-2",
        )}
      >
        <Link
          href="/dashboard"
          aria-label="WorkspaceHub dashboard"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-control p-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "lg:flex-none lg:justify-center",
          )}
        >
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-brand-blue text-base font-semibold text-brand-ice"
          >
            <WorkspaceLogo alt="" className="size-10" />
          </span>
          <span className={labelClassName}>
            <span className="block truncate text-[15px] font-bold leading-tight tracking-tight text-foreground">
              WorkspaceHub
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
              Your workspace
            </span>
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close navigation"
          onClick={onClose}
          className="shrink-0 text-muted-foreground lg:hidden"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain py-1"
        aria-label="Workspace navigation menu"
      >
        {WORKSPACE_NAVIGATION_ITEMS.map(
          ({ id, href, label, description, icon: Icon }) => {
            const active = isWorkspaceRouteActive(pathname, href);
            const rawBadge = badges[id];
            const badge = rawBadge ? resolvePomodoroBadge(rawBadge) : undefined;

            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "group relative flex shrink-0 items-center rounded-panel transition-all duration-150",
                      active ? "bg-primary-soft" : "hover:bg-muted/70",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-primary"
                      />
                    )}
                    <Link
                      href={href}
                      aria-label={label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-w-0 flex-1 items-center rounded-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring",
                        collapsed
                          ? "px-3 py-2.5 gap-3 lg:justify-center lg:p-2"
                          : "gap-3 px-3 py-2.5 text-left",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative flex size-9 shrink-0 items-center justify-center rounded-full transition-all",
                          active
                            ? "bg-card text-primary shadow-2xs ring-1 ring-border"
                            : "bg-muted text-muted-foreground group-hover:bg-card group-hover:text-foreground",
                        )}
                      >
                        <Icon className="size-[17px]" strokeWidth={2} />
                        {collapsed && badge && (
                          <span
                            className={cn(
                              "absolute -right-1 -top-1 hidden h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ring-2 ring-sidebar tabular-nums lg:flex",
                              getCollapsedMicroBadgeClasses(badge.tone),
                            )}
                          >
                            {badge.compactText ?? badge.text}
                          </span>
                        )}
                      </span>
                      <span className={labelClassName}>
                        <span
                          className={cn(
                            "block truncate text-[13px] leading-tight transition-colors",
                            active
                              ? "font-bold text-primary-soft-foreground"
                              : "font-semibold text-foreground",
                          )}
                        >
                          {label}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block truncate text-[11px] leading-tight",
                            active
                              ? "font-medium text-primary-soft-foreground/80"
                              : "text-muted-foreground",
                          )}
                        >
                          {description}
                        </span>
                      </span>
                    </Link>

                    {badge && (
                      <span className={cn("pr-2.5", collapsed && "lg:hidden")}>
                        {badge.isPomodoro ? (
                          <Button
                            type="button"
                            variant="unstyled"
                            title={badge.title}
                            aria-label="Toggle Pomodoro badge display"
                            onClick={() =>
                              setPomodoroBadgeOverride((prev) =>
                                prev === "auto"
                                  ? badge.pomodoroActive
                                    ? "progress"
                                    : "live"
                                  : prev === "live"
                                    ? "progress"
                                    : "live",
                              )
                            }
                            className={cn(
                              "inline-flex h-5 min-w-[22px] shrink-0 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold tabular-nums transition-colors",
                              getBadgeToneClasses(badge.tone, active),
                            )}
                          >
                            {badge.pulse && (
                              <span
                                aria-hidden="true"
                                className="size-1.5 rounded-full bg-current animate-pulse"
                              />
                            )}
                            <span>{badge.text}</span>
                          </Button>
                        ) : (
                          <span
                            title={badge.title}
                            className={cn(
                              "inline-flex h-5 min-w-[22px] shrink-0 items-center justify-center gap-1 rounded-full px-1.5 text-[10px] font-bold tabular-nums transition-colors",
                              getBadgeToneClasses(badge.tone, active),
                            )}
                          >
                            {badge.pulse && (
                              <span
                                aria-hidden="true"
                                className="size-1.5 rounded-full bg-current animate-pulse"
                              />
                            )}
                            <span>{badge.text}</span>
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent>
                    {label}
                    {badge ? ` (${badge.text})` : ""}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          },
        )}
      </nav>

      <div className="shrink-0 border-t border-border pt-3">
        <Button
          variant="unstyled"
          type="button"
          aria-label="Open settings"
          title={collapsed ? `Settings • ${email ?? ""}` : undefined}
          onClick={onOpenSettings}
          className={cn(
            "group flex w-full items-center rounded-panel border border-border bg-card text-left transition-all duration-150 hover:border-info-outline/50 hover:bg-muted/40 focus-visible:ring-inset motion-reduce:transition-none",
            collapsed
              ? "justify-between gap-2.5 p-3 lg:justify-center lg:p-2"
              : "justify-between gap-2.5 p-3",
          )}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info-soft text-info-content transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
            >
              <Settings className="size-4" strokeWidth={2} />
            </span>
            <span className={labelClassName}>
              <span className="block truncate text-[13px] font-bold leading-tight text-foreground">
                Settings
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {email}
              </span>
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground",
              collapsed && "lg:hidden",
            )}
          />
        </Button>
      </div>
    </SheetPanel>
  );
}
