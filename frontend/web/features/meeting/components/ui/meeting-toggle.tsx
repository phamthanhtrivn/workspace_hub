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
        "flex items-center justify-between gap-3 rounded-control p-3 transition-colors duration-150",
        isDark
          ? "bg-muted"
          : "border border-border bg-background",
        disabled && "opacity-70",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-secondary text-secondary-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">
            {title}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        </span>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        aria-label={title}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
