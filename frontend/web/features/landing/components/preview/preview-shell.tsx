import type { ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Menu,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LANDING_MODULES, type LandingModuleId } from "../../landing-content";
import { PREVIEW_FRAME_CLASS_NAME } from "./preview-data";
import { PreviewAvatar, PreviewIcon } from "./preview-ui";
import { WorkspaceLogo } from "@/components/common/workspace-logo";
import { WORKSPACE_NAVIGATION_ITEMS } from "@/components/layout/workspace-navigation";
import { PreviewWorkspaceClock } from "./preview-workspace-clock";

export function PreviewShell({
  moduleId,
  children,
}: {
  moduleId: LandingModuleId;
  children: ReactNode;
}) {
  const activeModule = LANDING_MODULES.find(
    (module) => module.id === moduleId,
  )!;
  const activeHref = moduleId === "messages" ? "/chat" : `/${moduleId}`;

  return (
    <div
      data-module-preview={moduleId}
      role="region"
      aria-label={`${activeModule.label} interface preview, sample data`}
      className={cn(
        "@container/preview flex min-w-0 overflow-hidden bg-background text-left font-sans text-sm text-foreground",
        PREVIEW_FRAME_CLASS_NAME,
      )}
    >
      <aside
        aria-label="Illustrated workspace navigation"
        className="hidden min-h-0 w-[68px] shrink-0 flex-col items-center border-r border-border bg-sidebar px-2 py-4 @min-[1024px]/preview:flex"
      >
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-brand-blue text-sm font-semibold text-brand-ice">
          <WorkspaceLogo className="size-10" />
        </span>
        <div
          role="region"
          aria-label="Sample workspace modules"
          tabIndex={0}
          className="mt-4 flex min-h-0 w-full flex-1 flex-col gap-1 overflow-y-auto overscroll-contain py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {WORKSPACE_NAVIGATION_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === activeHref;

            return (
              <span
                key={href}
                title={label}
                className={cn(
                  "relative flex items-center justify-center rounded-panel p-2",
                  isActive ? "bg-primary-soft" : "text-muted-foreground",
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-primary"
                  />
                )}
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    isActive
                      ? "bg-card text-primary shadow-2xs ring-1 ring-border"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-[17px]"
                    strokeWidth={2}
                  />
                </span>
                <span className="sr-only">{label}</span>
              </span>
            );
          })}
        </div>
        <span
          title="Settings"
          className="mt-3 flex w-full shrink-0 items-center justify-center rounded-panel border border-border bg-card p-2"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info-soft text-info-content">
            <Settings aria-hidden="true" className="size-4" strokeWidth={2} />
          </span>
          <span className="sr-only">Settings</span>
        </span>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-[76px] shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-3.5 @min-[640px]/preview:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground">
              <Menu
                aria-hidden="true"
                className="size-4 @min-[1024px]/preview:hidden"
              />
              <ChevronRight
                aria-hidden="true"
                className="hidden size-4 @min-[1024px]/preview:block"
              />
            </span>
            <div className="min-w-0">
              <p className="mb-0.5 hidden items-center gap-1.5 text-xs leading-4 text-muted-foreground @min-[640px]/preview:flex">
                <span>Workspace</span>
                <ChevronRight aria-hidden="true" className="size-3 shrink-0" />
                <span className="truncate font-medium text-info-content">
                  {activeModule.label}
                </span>
              </p>
              <p className="truncate text-section-title font-semibold">
                {activeModule.label}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 @min-[640px]/preview:gap-3">
            <PreviewWorkspaceClock />
            <span className="flex items-center gap-1 @min-[640px]/preview:gap-2 @min-[640px]/preview:border-l @min-[640px]/preview:border-border @min-[640px]/preview:pl-3">
              <PreviewIcon
                icon={CircleHelp}
                label="Help & shortcuts"
                className="size-9 rounded-xl border border-border bg-card"
              />
              <PreviewIcon
                icon={Bell}
                label="Notifications"
                className="size-9 rounded-xl border border-border bg-card"
              />
            </span>
            <span className="flex h-11 items-center gap-2 px-1.5 @min-[640px]/preview:border-l @min-[640px]/preview:border-border @min-[640px]/preview:pl-3">
              <PreviewAvatar
                name="Tri"
                className="size-9 ring-2 ring-info-soft"
              />
              <ChevronDown
                aria-hidden="true"
                className="hidden size-3.5 text-muted-foreground @min-[640px]/preview:block"
              />
            </span>
          </div>
        </div>
        <div className="@container/preview-module flex min-h-0 min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
