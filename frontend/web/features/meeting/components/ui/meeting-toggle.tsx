import type { LucideIcon } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface MeetingToggleProps {
  checked: boolean;
  title: string;
  description: string;
  icon: LucideIcon;
  variant?: "light" | "dark";
  disabled?: boolean;
  className?: string;
  onCheckedChange: (checked: boolean) => void;
}

export function MeetingToggle({
  checked,
  title,
  description,
  icon: Icon,
  variant = "light",
  disabled,
  className,
  onCheckedChange,
}: MeetingToggleProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg p-3 transition",
        isDark
          ? "bg-overlay/10 ring-1 ring-border/8 hover:bg-overlay/10"
          : "border border-border bg-background hover:border-border hover:bg-info-soft/70",
        disabled && "opacity-70",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-md",
            isDark ? "bg-overlay/10 text-info" : "bg-card text-info",
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block text-sm font-semibold",
              isDark ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "mt-0.5 block text-xs font-semibold leading-5",
              isDark ? "text-muted-foreground" : "text-muted-foreground",
            )}
          >
            {description}
          </span>
        </span>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
