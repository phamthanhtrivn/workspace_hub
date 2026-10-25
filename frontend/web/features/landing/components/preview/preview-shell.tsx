import type { ReactNode } from "react";
import { ChevronRight, PanelLeft, Search } from "lucide-react";
import { LANDING_MODULES, PREVIEW_PROJECT, type LandingModuleId } from "../../landing-content";
import { cn } from "@/lib/utils";

export function PreviewShell({ moduleId, children }: { moduleId: LandingModuleId; children: ReactNode }) {
  const activeModule = LANDING_MODULES.find((module) => module.id === moduleId)!;
  return (
    <div className="flex h-[464px] min-w-0 overflow-hidden rounded-b-panel bg-background text-left text-foreground sm:h-[444px] lg:h-[468px]">
      <aside aria-label="Illustrated workspace navigation" className="hidden w-44 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-5 lg:flex">
        <div className="mb-7 flex items-center gap-2 px-2 text-sm font-semibold"><span className="flex size-6 items-center justify-center rounded-md bg-brand-blue text-xs text-brand-ice">W</span>WorkspaceHub</div>
        <div className="space-y-1">
          {LANDING_MODULES.map(({ id, label, icon: Icon }) => (
            <div key={id} className={cn("flex items-center gap-2.5 rounded-control px-3 py-2 text-xs", id === moduleId ? "bg-primary-soft font-medium text-primary-soft-foreground" : "text-muted-foreground")}>
              <Icon aria-hidden="true" className="size-3.5" />{label}
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-border px-2 pt-4 text-xs text-muted-foreground"><PreviewAvatar name="Tri" />Personal workspace</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 text-xs text-muted-foreground sm:px-6">
          <PanelLeft aria-hidden="true" className="size-3.5 shrink-0 lg:hidden" />
          <span className="truncate">{PREVIEW_PROJECT}</span><ChevronRight aria-hidden="true" className="size-3 shrink-0" /><span className="text-foreground">{activeModule.label}</span>
          <Search aria-hidden="true" className="ml-auto size-3.5 shrink-0" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export function PreviewAvatar({ name, className }: { name: string; className?: string }) {
  return <span title={name} className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary-soft-foreground", className)}>{name.slice(0, 1)}</span>;
}

export function PreviewHeading({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return <div className="mb-5 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-base font-semibold tracking-tight sm:text-lg">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p></div>{children}</div>;
}
