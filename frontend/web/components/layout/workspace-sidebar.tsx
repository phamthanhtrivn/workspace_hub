"use client";

import Link from "next/link";
import { Settings, X } from "lucide-react";
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

interface WorkspaceSidebarProps {
  pathname: string;
  email: string | null;
  desktop: boolean;
  mobileOpen: boolean;
  collapsed: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
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
  const labelClassName = cn("min-w-0 flex-1", collapsed && "lg:hidden");

  return (
    <SheetPanel
      id="workspace-navigation"
      aria-label="Workspace navigation"
      open={desktop || mobileOpen}
      modal={!desktop}
      onClose={onClose}
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-5 shadow-dialog outline-none transition-[width,transform] duration-200 ease-in-out motion-reduce:transition-none lg:relative lg:flex",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "lg:w-24" : "lg:w-72",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/dashboard"
          aria-label="WorkspaceHub dashboard"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-control p-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "lg:justify-center",
          )}
        >
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-panel bg-brand-blue text-base font-semibold text-brand-ice"
          >
            W
          </span>
          <span className={labelClassName}>
            <span className="block truncate text-lg leading-6 font-semibold tracking-tight">
              WorkspaceHub
            </span>
            <span className="block truncate text-xs leading-5 text-muted-foreground">
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
        className="mt-7 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain"
        aria-label="Workspace navigation menu"
      >
        {WORKSPACE_NAVIGATION_ITEMS.map(
          ({ href, label, description, icon: Icon }) => {
            const active = isWorkspaceRouteActive(pathname, href);

            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex min-h-14 shrink-0 items-center gap-3 rounded-panel px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring motion-reduce:transition-none",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                      collapsed && "lg:justify-center",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-3 left-0 w-1 rounded-full bg-info-content"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl",
                        active
                          ? "text-sidebar-primary-foreground"
                          : "bg-card text-sidebar-foreground group-hover:text-info-content",
                      )}
                    >
                      <Icon className="size-[18px]" strokeWidth={1.75} />
                    </span>
                    <span className={labelClassName}>
                      <span className="block truncate text-sm leading-5 font-semibold">
                        {label}
                      </span>
                      <span
                        className={cn(
                          "block truncate text-xs leading-4 font-normal",
                          active
                            ? "text-sidebar-primary-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {description}
                      </span>
                    </span>
                  </Link>
                </TooltipTrigger>
                {collapsed && <TooltipContent>{label}</TooltipContent>}
              </Tooltip>
            );
          },
        )}
      </nav>

      <div className="shrink-0 pt-5">
        <Button
          variant="unstyled"
          type="button"
          aria-label="Open settings"
          title={collapsed ? "Settings" : undefined}
          onClick={onOpenSettings}
          className={cn(
            "flex min-h-16 w-full items-center gap-3 rounded-panel border border-info-outline/40 bg-card p-3 text-left transition-colors duration-150 hover:bg-info-soft focus-visible:ring-inset motion-reduce:transition-none",
            collapsed && "lg:justify-center lg:px-2",
          )}
        >
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-info-soft text-info-content"
          >
            <Settings className="size-[18px]" strokeWidth={1.75} />
          </span>
          <span className={labelClassName}>
            <span className="block text-sm leading-5 font-semibold text-foreground">
              Settings
            </span>
            <span className="block truncate text-xs leading-4 text-muted-foreground">
              {email}
            </span>
          </span>
        </Button>
      </div>
    </SheetPanel>
  );
}
