import type { ReactNode } from "react";
import { ChevronDown, Search, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PREVIEW_TONES = {
  muted: "bg-muted text-muted-foreground",
  info: "bg-info-soft text-info-content",
  warning: "bg-warning-soft text-warning-content",
  success: "bg-success-soft text-success-content",
  danger: "bg-destructive-soft text-destructive-content",
} as const;

export function PreviewBadge({ children, tone = "muted", className }: {
  children: ReactNode; tone?: keyof typeof PREVIEW_TONES; className?: string;
}) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold", PREVIEW_TONES[tone], className)}>{children}</span>;
}

export function PreviewAction({ children, variant = "outline", className }: {
  children: ReactNode; variant?: "default" | "outline" | "ghost" | "secondary"; className?: string;
}) {
  return <span className={cn(buttonVariants({ variant, size: "sm" }), "pointer-events-none cursor-default select-none", className)}>{children}</span>;
}

export function PreviewIcon({ icon: Icon, label, className }: { icon: LucideIcon; label: string; className?: string }) {
  return <span title={label} className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground", className)}><Icon aria-hidden="true" className="size-4" /><span className="sr-only">{label}</span></span>;
}

export function PreviewAvatar({ name, className }: { name: string; className?: string }) {
  return <span title={name} className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground", className)}>{name.slice(0, 1)}</span>;
}

export function PreviewHeading({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h4 className="text-page-title font-semibold tracking-tight">{title}</h4>{subtitle && <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>}</div>{children}</div>;
}

export function PreviewSearch({ placeholder, className }: { placeholder: string; className?: string }) {
  return <div className={cn("flex h-9 min-w-0 items-center gap-2 rounded-control border border-input bg-card px-3 text-xs text-muted-foreground", className)}><Search aria-hidden="true" className="size-3.5 shrink-0" /><span className="truncate">{placeholder}</span></div>;
}

export function PreviewSelect({ children }: { children: ReactNode }) {
  return <PreviewAction className="justify-between gap-5">{children}<ChevronDown aria-hidden="true" /></PreviewAction>;
}

export interface PreviewNavigationItem { label: string; icon: LucideIcon; active?: boolean; count?: string }

export function PreviewNavigation({ items, className }: { items: readonly PreviewNavigationItem[]; className?: string }) {
  return <div className={cn("flex gap-1.5", className)}>{items.map(({ label, icon: Icon, active, count }) => <div key={label} className={cn("flex shrink-0 items-center gap-3 rounded-control px-3 py-3 text-sm font-semibold", active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground")}><Icon aria-hidden="true" className="size-[18px] shrink-0" /><span className="whitespace-nowrap">{label}</span>{count && <span className="ml-auto text-xs">{count}</span>}</div>)}</div>;
}
