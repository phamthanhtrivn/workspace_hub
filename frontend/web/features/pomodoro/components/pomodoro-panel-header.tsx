import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PomodoroPanelHeader({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="space-y-4 border-b border-border/80 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-48 items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-wsh-ice-soft text-wsh-heading">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0 self-center">
            <h2 className="text-sm font-bold leading-snug text-wsh-heading [overflow-wrap:anywhere]">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </header>
  );
}
