import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PomodoroPanelHeader({ title, description, icon: Icon, action, children }: {
  title: string;
  description?: string;
  icon: LucideIcon;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return <header className="space-y-4 border-b border-border px-4 py-4 sm:px-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 basis-48 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-muted text-info-content"><Icon aria-hidden="true" className="size-4" /></span>
        <div className="min-w-0 self-center">
          <h2 className="text-base font-semibold leading-snug text-foreground">{title}</h2>
          {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </header>;
}
