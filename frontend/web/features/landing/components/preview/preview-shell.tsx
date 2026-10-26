import type { ReactNode } from "react";
import { Bell, BookOpen, CalendarDays, ChevronDown, Clock3, Files, FolderKanban, LayoutDashboard, Menu, MessageSquareText, Settings, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANDING_MODULES, type LandingModuleId } from "../../landing-content";
import { PREVIEW_FRAME_CLASS_NAME } from "./preview-data";
import { PreviewAvatar, PreviewIcon } from "./preview-ui";

const WORKSPACE_NAVIGATION = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "pomodoro", label: "Pomodoro", icon: Clock3 },
  { id: "messages", label: "Messages", icon: MessageSquareText },
  { id: "meetings", label: "Meetings", icon: Video },
  { id: "documents", label: "Documents", icon: Files },
  { id: "ai", label: "Notebook AI", icon: BookOpen },
] as const;

export function PreviewShell({ moduleId, children }: { moduleId: LandingModuleId; children: ReactNode }) {
  const activeModule = LANDING_MODULES.find((module) => module.id === moduleId)!;
  return (
    <div data-module-preview={moduleId} role="region" aria-label={`${activeModule.label} interface preview, sample data`} className={cn("@container/preview flex min-w-0 overflow-hidden bg-background text-left font-sans text-sm text-foreground", PREVIEW_FRAME_CLASS_NAME)}>
      <aside aria-label="Illustrated workspace navigation" className="hidden w-24 shrink-0 flex-col items-center border-r border-border bg-sidebar px-4 py-5 @min-[1024px]/preview:flex">
        <span className="grid size-11 shrink-0 place-items-center rounded-panel bg-brand-blue text-sm font-semibold text-brand-ice">W</span>
        <div className="mt-8 flex flex-1 flex-col gap-1.5">{WORKSPACE_NAVIGATION.map(({ id, label, icon: Icon }) => <span key={id} title={label} className={cn("grid size-12 place-items-center rounded-control", id === moduleId ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground")}><Icon aria-hidden="true" className="size-5" /><span className="sr-only">{label}</span></span>)}</div>
        <PreviewIcon icon={Settings} label="Settings" /><PreviewAvatar name="Tri" className="mt-3 size-9" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-[76px] shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-3.5 @min-[640px]/preview:px-6">
          <div className="flex min-w-0 items-center gap-3"><Menu aria-hidden="true" className="size-5 shrink-0 @min-[1024px]/preview:hidden" /><div><p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground @min-[640px]/preview:block">Workspace / {activeModule.label}</p><p className="text-section-title font-semibold">{activeModule.label}</p></div></div>
          <div className="flex shrink-0 items-center gap-3"><PreviewIcon icon={Bell} label="Notifications" /><PreviewAvatar name="Tri" className="size-8" /><ChevronDown aria-hidden="true" className="size-3 text-muted-foreground" /></div>
        </div>
        <div className="@container/preview-module flex min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
